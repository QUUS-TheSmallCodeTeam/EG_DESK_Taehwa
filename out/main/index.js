"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
const dotenv = require("dotenv");
const path = require("path");
const require$$5 = require("url");
const electron = require("electron");
const Store = require("electron-store");
const events = require("events");
const anthropic = require("@langchain/anthropic");
const openai = require("@langchain/openai");
const googleGenai = require("@langchain/google-genai");
const messages = require("@langchain/core/messages");
const tools = require("@langchain/core/tools");
const agents = require("langchain/agents");
const prompts = require("@langchain/core/prompts");
const fs = require("fs/promises");
const crypto = require("crypto");
class WebContentsManager extends events.EventEmitter {
  constructor() {
    super();
    this.mainWindow = null;
    this.webContentsViews = /* @__PURE__ */ new Map();
    this.currentTabId = null;
    this.isInitialized = false;
    this.boundsUpdateTimeout = null;
    this.lastRequestedBounds = null;
    this.preloadedSession = null;
  }
  /**
   * Initialize WebContentsManager with main window
   */
  initialize(mainWindow) {
    this.mainWindow = mainWindow;
    this.isInitialized = true;
  }
  /**
   * Create a new tab with WebContentsView
   */
  async createTab(url = "about:blank") {
    if (!this.isInitialized) {
      throw new Error("WebContentsManager not initialized");
    }
    const tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    try {
      const webContentsView = new electron.WebContentsView({
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: false,
          // Disable web security for development
          sandbox: false,
          // Disable sandbox for better compatibility
          // Handle certificate errors and improve SSL handling
          allowRunningInsecureContent: true,
          // Allow insecure content
          experimentalFeatures: false,
          // Improve rendering performance
          enableRemoteModule: false,
          // Better resource management
          backgroundThrottling: false,
          // Additional settings for better web content loading
          webgl: true,
          plugins: true,
          javascript: true,
          // Performance optimizations
          spellcheck: false,
          // Disable spellcheck for faster loading
          defaultEncoding: "utf-8",
          // Preload optimizations
          preload: null,
          // No preload script needed for web content
          // Network optimizations
          enableWebSQL: false,
          // Faster startup
          nodeIntegrationInWorker: false,
          nodeIntegrationInSubFrames: false
        }
      });
      this.setupWebContentsEvents(webContentsView, tabId);
      this.webContentsViews.set(tabId, webContentsView);
      await webContentsView.webContents.loadURL(url);
      this.emit("tab-created", { tabId, url });
      return tabId;
    } catch (error) {
      throw error;
    }
  }
  /**
   * Switch to a tab
   */
  async switchTab(tabId) {
    if (!this.webContentsViews.has(tabId)) {
      throw new Error(`Tab ${tabId} not found`);
    }
    try {
      const newView = this.webContentsViews.get(tabId);
      if (this.currentTabId && this.webContentsViews.has(this.currentTabId)) {
        const oldView = this.webContentsViews.get(this.currentTabId);
        try {
          if (this.mainWindow.contentView && this.mainWindow.contentView.children.includes(oldView)) {
            this.mainWindow.contentView.removeChildView(oldView);
          }
        } catch (e) {
        }
      }
      try {
        if (this.mainWindow.contentView) {
          this.mainWindow.contentView.addChildView(newView);
          if (typeof newView.setVisible === "function") {
            newView.setVisible(false);
          }
        } else {
          throw new Error("MainWindow contentView API not available");
        }
      } catch (addError) {
        throw addError;
      }
      this.currentTabId = tabId;
      this.emit("tab-switched", { tabId });
      return { id: tabId };
    } catch (error) {
      throw error;
    }
  }
  /**
   * Load URL in current or specified tab
   */
  async loadURL(url, tabId = null) {
    const targetTabId = tabId || this.currentTabId;
    if (!targetTabId || !this.webContentsViews.has(targetTabId)) {
      throw new Error("No active tab to load URL");
    }
    try {
      const webContentsView = this.webContentsViews.get(targetTabId);
      await webContentsView.webContents.loadURL(url);
      this.emit("url-loaded", { tabId: targetTabId, url });
      return { success: true, url, tabId: targetTabId };
    } catch (error) {
      throw error;
    }
  }
  /**
   * Navigate back
   */
  async goBack(tabId = null) {
    const targetTabId = tabId || this.currentTabId;
    if (!targetTabId || !this.webContentsViews.has(targetTabId)) {
      throw new Error("No active tab for navigation");
    }
    const webContentsView = this.webContentsViews.get(targetTabId);
    if (webContentsView.webContents.canGoBack()) {
      webContentsView.webContents.goBack();
      return { success: true };
    } else {
      return { success: false, reason: "Cannot go back" };
    }
  }
  /**
   * Navigate forward
   */
  async goForward(tabId = null) {
    const targetTabId = tabId || this.currentTabId;
    if (!targetTabId || !this.webContentsViews.has(targetTabId)) {
      throw new Error("No active tab for navigation");
    }
    const webContentsView = this.webContentsViews.get(targetTabId);
    if (webContentsView.webContents.canGoForward()) {
      webContentsView.webContents.goForward();
      return { success: true };
    } else {
      return { success: false, reason: "Cannot go forward" };
    }
  }
  /**
   * Reload current tab
   */
  async reload(tabId = null) {
    const targetTabId = tabId || this.currentTabId;
    if (!targetTabId || !this.webContentsViews.has(targetTabId)) {
      throw new Error("No active tab to reload");
    }
    const webContentsView = this.webContentsViews.get(targetTabId);
    webContentsView.webContents.reload();
    return { success: true, tabId: targetTabId };
  }
  /**
   * Execute JavaScript in the current tab
   */
  async executeScript(script, tabId = null) {
    const targetTabId = tabId || this.currentTabId;
    if (!targetTabId || !this.webContentsViews.has(targetTabId)) {
      throw new Error("No active tab to execute script");
    }
    try {
      const webContentsView = this.webContentsViews.get(targetTabId);
      const result = await webContentsView.webContents.executeJavaScript(script);
      return result;
    } catch (error) {
      throw error;
    }
  }
  /**
   * Get navigation state
   */
  getNavigationState(tabId = null) {
    const targetTabId = tabId || this.currentTabId;
    if (!targetTabId || !this.webContentsViews.has(targetTabId)) {
      return {
        canGoBack: false,
        canGoForward: false,
        isLoading: false,
        url: "about:blank",
        title: "No Tab"
      };
    }
    const webContentsView = this.webContentsViews.get(targetTabId);
    const webContents = webContentsView.webContents;
    const canGoBack = webContents.navigationHistory ? webContents.navigationHistory.canGoBack() : webContents.canGoBack();
    const canGoForward = webContents.navigationHistory ? webContents.navigationHistory.canGoForward() : webContents.canGoForward();
    return {
      canGoBack,
      canGoForward,
      isLoading: webContents.isLoading(),
      url: webContents.getURL(),
      title: webContents.getTitle()
    };
  }
  /**
   * Set explicit bounds for WebContentsView (Electron 37+)
   */
  setWebContentsViewBounds(webContentsView, preciseBounds = null) {
    let targetBounds;
    if (preciseBounds) {
      targetBounds = preciseBounds;
    } else {
      const windowBounds = this.mainWindow.getBounds();
      targetBounds = {
        x: 0,
        y: 0,
        width: windowBounds.width,
        height: windowBounds.height
      };
    }
    try {
      if (typeof webContentsView.setBounds === "function") {
        webContentsView.setBounds(targetBounds);
      } else {
        this.lastRequestedBounds = targetBounds;
      }
    } catch (error) {
    }
  }
  /**
   * Update WebContentsView bounds to match browser viewport area (Debounced)
   * Note: WebContentsView in Electron 37+ uses automatic positioning within contentView
   */
  updateWebContentsViewBounds(preciseBounds = null) {
    if (!this.currentTabId || !this.webContentsViews.has(this.currentTabId)) {
      return;
    }
    if (this.boundsUpdateTimeout) {
      clearTimeout(this.boundsUpdateTimeout);
    }
    const webContentsView = this.webContentsViews.get(this.currentTabId);
    if (preciseBounds) {
      this.lastRequestedBounds = preciseBounds;
    } else {
      const windowBounds = this.mainWindow.getBounds();
      const estimatedBounds = {
        x: 20,
        // Left margin + border
        y: 140,
        // Title bar + header + browser controls
        width: Math.max(windowBounds.width - 320, 400),
        // Leave space for chat
        height: Math.max(windowBounds.height - 200, 300)
        // Leave space for controls
      };
      this.lastRequestedBounds = estimatedBounds;
    }
    this.boundsUpdateTimeout = setTimeout(() => {
      this.applyBoundsToView(webContentsView, this.lastRequestedBounds);
    }, 16);
  }
  /**
   * Apply bounds to WebContentsView with optimizations
   */
  applyBoundsToView(webContentsView, bounds) {
    try {
      this.setWebContentsViewBounds(webContentsView, bounds);
      if (typeof webContentsView.setVisible === "function") {
        webContentsView.setVisible(true);
      }
    } catch (error) {
    }
  }
  /**
   * Set up WebContents event handlers
   */
  setupWebContentsEvents(webContentsView, tabId) {
    const webContents = webContentsView.webContents;
    webContents.on("did-navigate", (event, url) => {
      this.emit("navigation", { tabId, url, type: "navigate" });
    });
    webContents.on("did-navigate-in-page", (event, url) => {
      this.emit("navigation", { tabId, url, type: "navigate-in-page" });
    });
    webContents.on("did-finish-load", () => {
      const title = webContents.getTitle();
      const url = webContents.getURL();
      this.emit("loading-finished", { tabId, title, url });
    });
    webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
      this.emit("loading-failed", { tabId, errorCode, errorDescription, url: validatedURL });
    });
    webContents.on("page-title-updated", (event, title) => {
      this.emit("title-updated", { tabId, title });
    });
    webContents.on("certificate-error", (event, url, error, certificate, callback) => {
      event.preventDefault();
      callback(true);
    });
    webContents.on("did-start-loading", () => {
      this.emit("loading-started", { tabId });
    });
    webContents.on("did-stop-loading", () => {
      this.emit("loading-stopped", { tabId });
    });
  }
  /**
   * Close tab
   */
  closeTab(tabId) {
    if (!this.webContentsViews.has(tabId)) {
      throw new Error(`Tab ${tabId} not found`);
    }
    const webContentsView = this.webContentsViews.get(tabId);
    if (this.currentTabId === tabId) {
      try {
        if (this.mainWindow.contentView && this.mainWindow.contentView.children.includes(webContentsView)) {
          this.mainWindow.contentView.removeChildView(webContentsView);
        }
      } catch (e) {
      }
      this.currentTabId = null;
    }
    webContentsView.webContents.close();
    this.webContentsViews.delete(tabId);
    this.emit("tab-closed", { tabId });
  }
  /**
   * Get current tab
   */
  getCurrentTab() {
    if (this.currentTabId && this.webContentsViews.has(this.currentTabId)) {
      return { id: this.currentTabId };
    }
    return null;
  }
  /**
   * Get all tabs
   */
  getAllTabs() {
    const tabs = [];
    for (const [tabId, webContentsView] of this.webContentsViews) {
      const webContents = webContentsView.webContents;
      tabs.push({
        id: tabId,
        title: webContents.getTitle(),
        url: webContents.getURL(),
        isActive: tabId === this.currentTabId
      });
    }
    return tabs;
  }
  /**
   * Destroy WebContentsManager
   */
  destroy() {
    for (const tabId of this.webContentsViews.keys()) {
      try {
        this.closeTab(tabId);
      } catch (error) {
      }
    }
    this.webContentsViews.clear();
    this.currentTabId = null;
    this.mainWindow = null;
    this.isInitialized = false;
    this.removeAllListeners();
  }
}
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
const ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
const getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};
const ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
class ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
}
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};
const errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
let overrideErrorMap = errorMap;
function getErrorMap() {
  return overrideErrorMap;
}
const makeIssue = (params) => {
  const { data, path: path2, errorMaps, issueData } = params;
  const fullPath = [...path2, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === errorMap ? void 0 : errorMap
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
class ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
}
const INVALID = Object.freeze({
  status: "aborted"
});
const DIRTY = (value) => ({ status: "dirty", value });
const OK = (value) => ({ status: "valid", value });
const isAborted = (x) => x.status === "aborted";
const isDirty = (x) => x.status === "dirty";
const isValid = (x) => x.status === "valid";
const isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));
class ParseInputLazyPath {
  constructor(parent, value, path2, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path2;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
}
const handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
class ZodType {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
}
const cuidRegex = /^c[^\s-]{8,}$/i;
const cuid2Regex = /^[0-9a-z]+$/;
const ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
const uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
const nanoidRegex = /^[a-z0-9_-]{21}$/i;
const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
const durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
const emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
const _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
let emojiRegex;
const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
const ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
const ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
const base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
const base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
const dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
const dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
class ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
}
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
class ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
}
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
class ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
}
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
class ZodBoolean extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
class ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
}
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
class ZodSymbol extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
class ZodUndefined extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
class ZodNull extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
class ZodAny extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
}
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
class ZodUnknown extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
}
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
class ZodNever extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
}
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
class ZodVoid extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
class ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
}
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
class ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") ;
      else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
}
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
class ZodUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
}
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
class ZodIntersection extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
}
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
class ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new ZodTuple({
      ...this._def,
      rest
    });
  }
}
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
class ZodMap extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
}
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
class ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
}
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
class ZodLazy extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
}
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
class ZodLiteral extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
}
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
class ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
}
ZodEnum.create = createZodEnum;
class ZodNativeEnum extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
}
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
class ZodPromise extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
}
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
class ZodEffects extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
}
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
class ZodOptional extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
class ZodNullable extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
class ZodDefault extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
}
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
class ZodCatch extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
}
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
class ZodNaN extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
}
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
class ZodBranded extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
}
class ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
}
class ZodReadonly extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
const stringType = ZodString.create;
ZodNever.create;
ZodArray.create;
const objectType = ZodObject.create;
ZodUnion.create;
ZodIntersection.create;
ZodTuple.create;
ZodEnum.create;
ZodPromise.create;
ZodOptional.create;
ZodNullable.create;
class LangChainService {
  constructor(secureKeyManager) {
    this.secureKeyManager = secureKeyManager;
    this.providers = /* @__PURE__ */ new Map();
    this.currentProvider = "claude";
    this.currentModel = null;
    this.isInitialized = false;
    this.blogAutomationTool = null;
    this.electronWindow = null;
    this.currentConversationHistory = [];
    this.agentExecutor = null;
    this.costTracker = {
      session: { input: 0, output: 0, total: 0 },
      total: { input: 0, output: 0, total: 0 }
    };
    this.providerConfigs = {
      claude: {
        name: "Claude (4.0 Sonnet)",
        models: [
          { id: "claude-3-5-sonnet-20241022", name: "Claude 4.0 Sonnet", context: 2e5 }
        ],
        defaultModel: "claude-3-5-sonnet-20241022",
        costPer1k: { input: 3e-3, output: 0.015 }
      },
      openai: {
        name: "ChatGPT (GPT-4o)",
        models: [
          { id: "gpt-4o", name: "GPT-4o", context: 128e3 }
        ],
        defaultModel: "gpt-4o",
        costPer1k: { input: 5e-3, output: 0.015 }
      },
      gemini: {
        name: "Gemini (2.5 Flash)",
        models: [
          { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", context: 1e6 }
        ],
        defaultModel: "gemini-2.5-flash",
        costPer1k: { input: 125e-5, output: 375e-5 }
      }
    };
  }
  /**
   * Set Electron window reference for IPC communication
   */
  async setElectronWindow(window) {
    this.electronWindow = window;
    await this.initializeBlogTool();
  }
  /**
   * Check if message is a blog request
   */
  checkIfBlogRequest(message) {
    const blogPatterns = [
      /블로그.*(?:써|작성|만들|생성|게시)/i,
      /(?:써|작성|만들|생성|게시).*블로그/i,
      /blog.*(?:write|create|post|article|publish)/i,
      /(?:write|create|post|publish).*(?:blog|article)/i,
      /글.*(?:써|작성|게시)/i,
      /포스트.*(?:작성|올려|게시)/i,
      /아티클.*(?:써|작성|게시)/i,
      /게시.*(?:블로그|글|포스트)/i
    ];
    return blogPatterns.some((pattern) => pattern.test(message));
  }
  /**
   * Initialize blog automation tool
   */
  async initializeBlogTool() {
    if (!this.electronWindow) return;
    const blogSchema = objectType({
      topic: stringType().describe("The main topic or title of the blog post")
    });
    this.blogAutomationTool = tools.tool(
      async ({ topic }, runManager) => {
        const subtopics = [];
        const audience = "일반 독자";
        const tone = "professional";
        const keywords = [];
        try {
          console.log("🚀 [BlogAutomationTool] Starting blog automation workflow");
          console.log("📝 [BlogAutomationTool] Tool called with params:", {
            topic,
            subtopics,
            audience,
            tone,
            keywords
          });
          const conversationContext = this.currentConversationHistory || [];
          const sendProgress = (message) => {
            this.electronWindow.webContents.send("blog-automation-progress", { message });
          };
          sendProgress(`📝 블로그 작성을 시작합니다. 주제: "${topic}"`);
          sendProgress("🎯 제목을 생성하고 있습니다...");
          const titlePrompt = `${conversationContext.length > 0 ? "이전 대화 내용을 참고하여, " : ""}주제 "${topic}"에 대한 매력적인 블로그 제목을 한국어로 만들어주세요. 
          대상 독자: ${audience}, 톤: ${tone}
          제목만 반환하세요.`;
          const titleMessages = [
            new messages.SystemMessage("당신은 전문 블로그 작가입니다. 주어진 주제에 대해 매력적이고 SEO에 최적화된 한국어 블로그 제목을 생성해주세요. 따옴표 없이 제목만 출력하세요."),
            new messages.HumanMessage(titlePrompt)
          ];
          if (!this.providers.has("openai")) {
            console.error("❌ [BlogAutomationTool] OpenAI provider not available");
            throw new Error("OpenAI provider not available");
          }
          console.log("📝 [BlogAutomationTool] Generating title with messages:", titleMessages.length);
          const contentModel = new openai.ChatOpenAI({
            apiKey: (await this.secureKeyManager.getProviderKey("openai")).api_key,
            model: "gpt-4o",
            temperature: 0.7
          });
          const titleResponse = await contentModel.invoke(titleMessages);
          console.log("📝 [BlogAutomationTool] Title response:", titleResponse);
          const rawTitle = titleResponse.content?.trim() || `${topic}에 대한 전문가 가이드`;
          const title = rawTitle.replace(/^["']|["']$/g, "").trim();
          console.log("📝 [BlogAutomationTool] Generated title:", title);
          sendProgress(`✅ 제목 생성 완료: ${title}`);
          sendProgress("📝 본문 내용을 작성하고 있습니다...");
          const contentPrompt = `${conversationContext.length > 0 ? "우리의 대화 내용을 바탕으로, " : ""}다음 블로그 글을 작성해주세요:
          제목: ${title}
          주제: ${topic}
          하위 주제: ${subtopics?.join(", ") || "자유롭게 구성"}
          대상 독자: ${audience}
          톤: ${tone}
          키워드: ${keywords?.join(", ") || ""}
          
          ${conversationContext.length > 0 ? "대화에서 언급된 중요한 포인트들을 포함시켜주세요." : ""}
          HTML 형식으로 작성하되, 구조화된 섹션과 단락으로 나누어주세요.`;
          const contentMessages = [];
          if (conversationContext.length > 0) {
            contentMessages.push(...conversationContext.slice(-10));
          }
          contentMessages.push(new messages.HumanMessage(contentPrompt));
          const contentResponse = await contentModel.invoke(contentMessages);
          const content = contentResponse.content;
          sendProgress("✅ 본문 작성 완료");
          sendProgress("🎨 이미지를 생성하고 있습니다...");
          const images = [];
          const featuredImagePrompt = `Create a professional blog header image for: "${title}". 
          Style: Clean, modern, professional. 
          Theme: ${topic}`;
          const sectionImagePrompt = `Create a supporting illustration for a blog about: "${topic}".
          Style: Informative, technical diagram or conceptual illustration.`;
          images.push({
            type: "featured",
            prompt: featuredImagePrompt,
            placeholder: true
          });
          images.push({
            type: "section",
            prompt: sectionImagePrompt,
            placeholder: true
          });
          sendProgress("✅ 이미지 생성 완료 (2개)");
          sendProgress("📐 최종 포맷팅 중...");
          const formattedContent = `
          <article>
            <h1>${title}</h1>
            <!-- Featured Image Placeholder -->
            <figure class="featured-image">
              <img src="[FEATURED_IMAGE]" alt="${title}" />
            </figure>
            
            ${content}
            
            <!-- Section Image Placeholder -->
            <figure class="section-image">
              <img src="[SECTION_IMAGE]" alt="${topic} illustration" />
            </figure>
          </article>
          `;
          sendProgress("📤 WordPress에 게시 준비 중...");
          console.log("🔔 [BlogAutomationTool] Sending IPC to renderer:", {
            title,
            topic,
            hasContent: !!formattedContent,
            hasImages: images.length
          });
          this.electronWindow.webContents.send("start-blog-automation-from-tool", {
            title,
            content: formattedContent,
            topic,
            images,
            metadata: {
              audience,
              tone,
              keywords,
              subtopics
            },
            fromTool: true
          });
          return `✅ 블로그 자동화가 완료되었습니다!
📌 제목: ${title}
🎨 이미지: 2개 생성됨
📝 상태: WordPress 게시 진행 중...`;
        } catch (error) {
          console.error("[BlogAutomationTool] Error:", error);
          return `❌ 블로그 자동화 실패: ${error.message}`;
        }
      },
      {
        name: "create_blog_post",
        description: "Creates a blog post. Use when user asks to write a blog, post, or article about any topic. Extract the topic from the user's request.",
        schema: blogSchema
      }
    );
    console.log("🛠️ LangChainService: Blog automation tool initialized");
    await this.initializeAgentExecutor();
  }
  /**
   * Initialize agent executor for tool calling
   */
  async initializeAgentExecutor() {
    console.log("🤖 LangChainService: Initializing agent executor");
    if (!this.providers.has(this.currentProvider)) {
      console.log("⚠️ LangChainService: No provider available for agent executor");
      return;
    }
    const provider = this.providers.get(this.currentProvider);
    const tools2 = [this.blogAutomationTool];
    try {
      const prompt = prompts.ChatPromptTemplate.fromMessages([
        [
          "system",
          `You are an AI assistant for 태화트랜스 (Taehwa Trans), specializing in electrical sensors and blog automation.

IMPORTANT RULES:
1. When a user asks you to write a blog, article, or post, you MUST use the create_blog_post tool.
2. Do NOT write blog content directly in the chat.
3. Extract the topic from the user's request and use it in the tool call.
4. The create_blog_post tool will handle all aspects of blog creation including title, content, images, and publishing.

You have access to the following tool:
{tools}

To use a tool, respond with a JSON object with 'name' and 'arguments' keys:
{{"name": "tool_name", "arguments": {{"param1": "value1", "param2": "value2"}}}}

Examples:
- User: "블로그 글 써줘" -> Use create_blog_post with a relevant topic
- User: "로고스키 코일에 대한 블로그 글을 써줘" -> Use create_blog_post with topic: "로고스키 코일"
- User: "Write a blog about smart grids" -> Use create_blog_post with topic: "smart grids"`
        ],
        ["user", "{input}"],
        new prompts.MessagesPlaceholder("agent_scratchpad")
      ]);
      if (this.currentProvider === "openai") {
        try {
          const modelWithTools = provider.instance.bind({
            tools: [this.blogAutomationTool]
          });
          this.modelWithTools = modelWithTools;
          const agent = await agents.createOpenAIFunctionsAgent({
            llm: provider.instance,
            tools: tools2,
            prompt
          });
          this.agentExecutor = new agents.AgentExecutor({
            agent,
            tools: tools2,
            verbose: true,
            returnIntermediateSteps: true,
            maxIterations: 3,
            handleParsingErrors: true
          });
          console.log("✅ LangChainService: Model with tools and agent executor initialized");
        } catch (error) {
          console.error("❌ LangChainService: Failed to create agent with tools:", error);
          this.agentExecutor = null;
          this.modelWithTools = null;
        }
      } else {
        console.log("⚠️ LangChainService: Agent executor only fully supported for OpenAI");
        this.agentExecutor = null;
        this.modelWithTools = null;
        return;
      }
      console.log("✅ LangChainService: Agent executor initialized successfully");
    } catch (error) {
      console.error("❌ LangChainService: Failed to initialize agent executor:", error);
      this.agentExecutor = null;
    }
  }
  /**
   * Initialize the LangChain service
   */
  async initialize() {
    try {
      console.log("🔧 LangChainService: Starting initialization...");
      if (!this.secureKeyManager || !this.secureKeyManager.isInitialized) {
        console.error("❌ LangChainService: SecureKeyManager not initialized");
        throw new Error("SecureKeyManager not initialized");
      }
      console.log("✅ LangChainService: SecureKeyManager is ready");
      await this.initializeProviders();
      this.isInitialized = true;
      console.log("✅ LangChainService: Initialization complete");
      console.log("📊 LangChainService: Current status:", {
        isInitialized: this.isInitialized,
        currentProvider: this.currentProvider,
        currentModel: this.currentModel,
        availableProviders: Array.from(this.providers.keys())
      });
      return true;
    } catch (error) {
      console.error("❌ LangChainService: Initialization failed:", error);
      throw error;
    }
  }
  /**
   * Initialize available providers based on stored API keys
   */
  async initializeProviders() {
    console.log("🔍 LangChainService: Starting provider initialization...");
    const availableProviders = [];
    this.currentProvider = "openai";
    this.currentModel = this.providerConfigs.openai.defaultModel;
    console.log("📝 LangChainService: Set default provider to OpenAI with model:", this.currentModel);
    console.log("🔑 LangChainService: Checking API keys for all providers...");
    for (const [providerId, config] of Object.entries(this.providerConfigs)) {
      try {
        console.log(`🔍 LangChainService: Checking provider ${providerId}...`);
        const hasKey = this.secureKeyManager.hasProviderKey(providerId);
        console.log(`🔑 LangChainService: Provider ${providerId} has API key:`, hasKey);
        if (hasKey) {
          console.log(`🔓 LangChainService: Getting API key for ${providerId}...`);
          const keyData = await this.secureKeyManager.getProviderKey(providerId);
          console.log(`✅ LangChainService: Got API key for ${providerId}, key length:`, keyData.api_key?.length || 0);
          console.log(`🏗️ LangChainService: Creating provider instance for ${providerId}...`);
          const provider = await this.createProvider(providerId, keyData.api_key);
          if (provider) {
            console.log(`✅ LangChainService: Successfully created provider ${providerId}`);
            this.providers.set(providerId, {
              instance: provider,
              config,
              currentModel: config.defaultModel,
              status: "ready"
            });
            availableProviders.push(providerId);
            console.log(`📊 LangChainService: Provider ${providerId} added to available providers`);
            if (!this.currentProvider || !this.providers.has(this.currentProvider)) {
              console.log(`🎯 LangChainService: Setting ${providerId} as current provider`);
              this.currentProvider = providerId;
              this.currentModel = config.defaultModel;
            }
          } else {
            console.warn(`⚠️ LangChainService: Failed to create provider instance for ${providerId}`);
          }
        } else {
          console.log(`🔒 LangChainService: No API key found for ${providerId}`);
        }
      } catch (error) {
        console.error(`❌ LangChainService: Error initializing provider ${providerId}:`, error.message);
      }
    }
    console.log("📊 LangChainService: Provider initialization summary:", {
      availableProviders,
      totalProviders: availableProviders.length,
      currentProvider: this.currentProvider,
      currentModel: this.currentModel,
      providersMap: Array.from(this.providers.keys())
    });
    if (availableProviders.length === 0) {
      console.warn("⚠️ LangChainService: No AI providers available. Please configure API keys.");
      this.currentProvider = "openai";
      this.currentModel = this.providerConfigs.openai.defaultModel;
      console.log("🎯 LangChainService: Fallback - Set default provider to OpenAI for UI purposes");
    } else {
      console.log(`✅ LangChainService: Successfully initialized ${availableProviders.length} providers`);
    }
  }
  /**
   * Create provider instance based on type
   */
  async createProvider(providerId, apiKey) {
    console.log(`🏗️ LangChainService: Creating provider ${providerId} with key length:`, apiKey?.length || 0);
    try {
      let provider;
      switch (providerId) {
        case "claude":
          console.log("🤖 LangChainService: Creating ChatAnthropic instance...");
          provider = new anthropic.ChatAnthropic({
            apiKey,
            model: this.providerConfigs.claude.defaultModel,
            temperature: 0.7,
            maxTokens: 4e3
          });
          break;
        case "openai":
          console.log("🧠 LangChainService: Creating ChatOpenAI instance...");
          provider = new openai.ChatOpenAI({
            apiKey,
            model: this.providerConfigs.openai.defaultModel,
            temperature: 0.7,
            maxTokens: 4e3
          });
          break;
        case "gemini":
          console.log("💎 LangChainService: Creating ChatGoogleGenerativeAI instance...");
          provider = new googleGenai.ChatGoogleGenerativeAI({
            apiKey,
            model: this.providerConfigs.gemini.defaultModel,
            temperature: 0.7,
            maxOutputTokens: 4e3
          });
          break;
        default:
          throw new Error(`Unsupported provider: ${providerId}`);
      }
      console.log(`✅ LangChainService: Successfully created provider instance for ${providerId}`);
      return provider;
    } catch (error) {
      console.error(`❌ LangChainService: Failed to create provider ${providerId}:`, error.message);
      throw error;
    }
  }
  /**
   * Switch to a different provider
   */
  async switchProvider(providerId, modelId = null) {
    console.log(`🔄 LangChainService: Switching to provider ${providerId} with model ${modelId}`);
    if (!this.isInitialized) {
      console.error("❌ LangChainService: Service not initialized for provider switch");
      throw new Error("LangChainService not initialized");
    }
    this.currentProvider = providerId;
    console.log(`📝 LangChainService: Set current provider to ${providerId}`);
    if (!this.providers.has(providerId)) {
      console.log(`⚠️ LangChainService: Provider ${providerId} not in initialized providers map`);
      const config = this.providerConfigs[providerId];
      if (!config) {
        console.error(`❌ LangChainService: Unknown provider ${providerId}`);
        throw new Error(`Unknown provider ${providerId}`);
      }
      this.currentModel = modelId || config.defaultModel;
      console.log(`📝 LangChainService: Set model to ${this.currentModel} for provider without API key`);
      const result2 = {
        success: true,
        provider: providerId,
        model: this.currentModel,
        status: "no_api_key",
        message: `Provider ${providerId} selected but API key not configured`
      };
      console.log("✅ LangChainService: Provider switch result (no API key):", result2);
      return result2;
    }
    console.log(`✅ LangChainService: Provider ${providerId} found in initialized providers`);
    const provider = this.providers.get(providerId);
    if (modelId) {
      console.log(`🔄 LangChainService: Updating model to ${modelId}`);
      const config = this.providerConfigs[providerId];
      const model = config.models.find((m) => m.id === modelId);
      if (!model) {
        console.error(`❌ LangChainService: Model ${modelId} not available for provider ${providerId}`);
        throw new Error(`Model ${modelId} not available for provider ${providerId}`);
      }
      console.log(`🔄 LangChainService: Recreating provider instance with new model...`);
      const keyData = await this.secureKeyManager.getProviderKey(providerId);
      provider.instance = await this.createProvider(providerId, keyData.api_key);
      provider.instance.model = modelId;
      provider.currentModel = modelId;
      console.log(`✅ LangChainService: Updated provider instance with model ${modelId}`);
    }
    this.currentProvider = providerId;
    this.currentModel = provider.currentModel;
    if (this.blogAutomationTool) {
      await this.initializeAgentExecutor();
    }
    const result = {
      success: true,
      provider: providerId,
      model: this.currentModel,
      config: provider.config
    };
    console.log("✅ LangChainService: Provider switch result (with API key):", result);
    return result;
  }
  /**
   * Send a chat message
   */
  async sendMessage(message, conversationHistory = [], systemPrompt = null) {
    console.log("📨 [LangChainService] Received message:", message.substring(0, 50) + "...");
    if (!this.isInitialized) {
      throw new Error("LangChainService not initialized");
    }
    if (!this.providers.has(this.currentProvider)) {
      return {
        success: false,
        error: `${this.currentProvider} API key not configured. Please add your API key in settings.`,
        provider: this.currentProvider,
        model: this.currentModel,
        metadata: {
          timestamp: Date.now(),
          needsApiKey: true
        }
      };
    }
    try {
      const provider = this.providers.get(this.currentProvider);
      const messages$1 = this.buildMessageHistory(message, conversationHistory, systemPrompt);
      this.currentConversationHistory = messages$1;
      const startTime = Date.now();
      let response;
      if (this.modelWithTools && this.currentProvider === "openai") {
        console.log("🤖 [LangChainService] Using model with tools - letting LLM decide");
        try {
          const toolMessages = [
            new messages.SystemMessage(`You are an AI assistant for 태화트랜스 (Taehwa Trans). You have access to tools including blog creation. Use tools when appropriate based on user requests.`),
            ...messages$1.slice(1)
            // Skip the original system message
          ];
          const toolResponse = await this.modelWithTools.invoke(toolMessages);
          console.log("🛠️ [LangChainService] Tool response:", {
            hasContent: !!toolResponse.content,
            hasToolCalls: !!(toolResponse.tool_calls && toolResponse.tool_calls.length > 0),
            toolCalls: toolResponse.tool_calls
          });
          if (toolResponse.tool_calls && toolResponse.tool_calls.length > 0) {
            for (const toolCall of toolResponse.tool_calls) {
              console.log("🔧 [LangChainService] Executing tool call:", toolCall);
              if (toolCall.name === "create_blog_post") {
                const result2 = await this.blogAutomationTool.invoke(toolCall.args);
                console.log("✅ [LangChainService] Tool execution result:", result2);
                response = {
                  content: "블로그 작성을 시작했습니다. 잠시 후 WordPress에 게시됩니다.",
                  tool_calls: [toolCall]
                };
              }
            }
          } else {
            console.log("💬 [LangChainService] LLM chose not to use tools");
            response = toolResponse;
          }
        } catch (modelError) {
          console.error("❌ [LangChainService] Model with tools failed:", modelError);
          response = await provider.instance.invoke(messages$1);
        }
      } else {
        console.log("💬 [LangChainService] Using regular chat (not a blog request)");
        response = await provider.instance.invoke(messages$1);
      }
      const endTime = Date.now();
      console.log("📥 [LangChainService] Response received:", {
        hasContent: !!response.content,
        contentLength: response.content?.length,
        contentPreview: response.content?.substring(0, 100) + "...",
        hasToolCalls: !!(response.tool_calls && response.tool_calls.length > 0),
        toolCallsCount: response.tool_calls?.length || 0,
        responseKeys: Object.keys(response)
      });
      const inputTokens = this.estimateTokens(messages$1);
      const outputTokens = this.estimateTokens([response]);
      const cost = this.calculateCost(inputTokens, outputTokens);
      this.updateCostTracking(inputTokens, outputTokens, cost);
      const result = {
        success: true,
        message: response.content || (response.tool_calls ? "블로그 작성을 시작합니다..." : ""),
        provider: this.currentProvider,
        model: this.currentModel,
        metadata: {
          inputTokens,
          outputTokens,
          cost,
          responseTime: endTime - startTime,
          timestamp: Date.now(),
          toolCalls: response.tool_calls
        }
      };
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: this.currentProvider,
        model: this.currentModel,
        metadata: {
          timestamp: Date.now()
        }
      };
    }
  }
  /**
   * Stream a chat message (for real-time responses)
   */
  async streamMessage(message, conversationHistory = [], systemPrompt = null, onChunk = null) {
    console.log("🌊 [LangChainService] Starting streaming for:", message.substring(0, 50) + "...");
    if (!this.isInitialized) {
      throw new Error("LangChainService not initialized");
    }
    if (!this.providers.has(this.currentProvider)) {
      return {
        success: false,
        error: `${this.currentProvider} API key not configured. Please add your API key in settings.`,
        provider: this.currentProvider,
        model: this.currentModel,
        metadata: {
          timestamp: Date.now(),
          needsApiKey: true,
          streamed: true
        }
      };
    }
    try {
      const provider = this.providers.get(this.currentProvider);
      const messages2 = this.buildMessageHistory(message, conversationHistory, systemPrompt);
      this.currentConversationHistory = messages2;
      console.log("🔄 [LangChainService] Redirecting streaming to regular message for tool decision");
      return await this.sendMessage(message, conversationHistory, systemPrompt);
      const startTime = Date.now();
      let fullResponse = "";
      const stream = await provider.instance.stream(messages2);
      for await (const chunk of stream) {
        const content = chunk.content;
        if (content) {
          fullResponse += content;
          if (onChunk) {
            onChunk(content);
          }
        }
      }
      const endTime = Date.now();
      console.log("✅ [LangChainService] Streaming complete:", {
        responseLength: fullResponse.length,
        responseTime: endTime - startTime,
        preview: fullResponse.substring(0, 100) + "..."
      });
      const inputTokens = this.estimateTokens(messages2);
      const outputTokens = this.estimateTokens([{ content: fullResponse }]);
      const cost = this.calculateCost(inputTokens, outputTokens);
      this.updateCostTracking(inputTokens, outputTokens, cost);
      const result = {
        success: true,
        message: fullResponse,
        provider: this.currentProvider,
        model: this.currentModel,
        metadata: {
          inputTokens,
          outputTokens,
          cost,
          responseTime: endTime - startTime,
          timestamp: Date.now(),
          streamed: true
        }
      };
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: this.currentProvider,
        model: this.currentModel,
        metadata: {
          timestamp: Date.now(),
          streamed: true
        }
      };
    }
  }
  /**
   * Build message history for LangChain
   */
  buildMessageHistory(currentMessage, conversationHistory = [], systemPrompt = null) {
    const messages$1 = [];
    if (systemPrompt) {
      messages$1.push(new messages.SystemMessage(systemPrompt));
    }
    for (const historyItem of conversationHistory) {
      if (historyItem.role === "user") {
        messages$1.push(new messages.HumanMessage(historyItem.content));
      } else if (historyItem.role === "assistant") {
        messages$1.push(new messages.AIMessage(historyItem.content));
      }
    }
    messages$1.push(new messages.HumanMessage(currentMessage));
    return messages$1;
  }
  /**
   * Estimate token count (rough approximation)
   */
  estimateTokens(messages2) {
    const text = messages2.map((msg) => {
      if (typeof msg === "string") return msg;
      if (msg.content) return msg.content;
      return "";
    }).join(" ");
    return Math.ceil(text.length / 4);
  }
  /**
   * Calculate cost based on provider rates
   */
  calculateCost(inputTokens, outputTokens) {
    const config = this.providerConfigs[this.currentProvider];
    if (!config || !config.costPer1k) {
      return 0;
    }
    const inputCost = inputTokens / 1e3 * config.costPer1k.input;
    const outputCost = outputTokens / 1e3 * config.costPer1k.output;
    return inputCost + outputCost;
  }
  /**
   * Update cost tracking
   */
  updateCostTracking(inputTokens, outputTokens, cost) {
    this.costTracker.session.input += inputTokens;
    this.costTracker.session.output += outputTokens;
    this.costTracker.session.total += cost;
    this.costTracker.total.input += inputTokens;
    this.costTracker.total.output += outputTokens;
    this.costTracker.total.total += cost;
  }
  /**
   * Get available providers
   */
  getAvailableProviders() {
    const providers = [];
    for (const [providerId, providerData] of this.providers) {
      const config = this.providerConfigs[providerId];
      providers.push({
        id: providerId,
        name: config.name,
        models: config.models,
        currentModel: providerData.currentModel,
        status: providerData.status,
        isCurrent: providerId === this.currentProvider
      });
    }
    return providers;
  }
  /**
   * Get current provider status
   */
  getCurrentProviderStatus() {
    console.log("📊 LangChainService: Getting current provider status...");
    console.log("📊 LangChainService: Current state:", {
      currentProvider: this.currentProvider,
      currentModel: this.currentModel,
      isInitialized: this.isInitialized,
      providersCount: this.providers.size,
      availableProviders: Array.from(this.providers.keys())
    });
    if (!this.currentProvider) {
      console.log("⚠️ LangChainService: No current provider set");
      return {
        provider: null,
        model: null,
        status: "disconnected",
        costTracker: this.costTracker
      };
    }
    const config = this.providerConfigs[this.currentProvider];
    if (!config) {
      console.log(`❌ LangChainService: No config found for provider ${this.currentProvider}`);
      return {
        provider: null,
        model: null,
        status: "disconnected",
        costTracker: this.costTracker
      };
    }
    console.log(`📝 LangChainService: Found config for provider ${this.currentProvider}`);
    if (this.providers.has(this.currentProvider)) {
      console.log(`✅ LangChainService: Provider ${this.currentProvider} is initialized with API key`);
      const provider = this.providers.get(this.currentProvider);
      const status2 = {
        provider: {
          id: this.currentProvider,
          name: config.name,
          currentModel: this.currentModel
        },
        model: config.models.find((m) => m.id === this.currentModel),
        status: provider.status,
        costTracker: this.costTracker
      };
      console.log("📊 LangChainService: Status with API key:", status2);
      return status2;
    }
    console.log(`⚠️ LangChainService: Provider ${this.currentProvider} selected but no API key configured`);
    const status = {
      provider: {
        id: this.currentProvider,
        name: config.name,
        currentModel: this.currentModel
      },
      model: config.models.find((m) => m.id === this.currentModel),
      status: "no_api_key",
      costTracker: this.costTracker
    };
    console.log("📊 LangChainService: Status without API key:", status);
    return status;
  }
  /**
   * Reset session cost tracking
   */
  resetSessionCosts() {
    this.costTracker.session = { input: 0, output: 0, total: 0 };
  }
  /**
   * Test provider connection
   */
  async testProvider(providerId) {
    try {
      if (!this.providers.has(providerId)) {
        throw new Error(`Provider ${providerId} not available`);
      }
      const testMessage = "Hello! Please respond with 'Connection test successful.' to confirm the API is working.";
      const result = await this.sendMessage(testMessage, []);
      if (result.success) {
        return {
          success: true,
          provider: providerId,
          message: "Provider connection test successful",
          response: result.message,
          metadata: result.metadata
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      return {
        success: false,
        provider: providerId,
        error: error.message
      };
    }
  }
  /**
   * Get provider models
   */
  getProviderModels(providerId) {
    const config = this.providerConfigs[providerId];
    return config ? config.models : [];
  }
  /**
   * Update provider model
   */
  async updateProviderModel(providerId, modelId) {
    if (!this.providers.has(providerId)) {
      throw new Error(`Provider ${providerId} not available`);
    }
    const config = this.providerConfigs[providerId];
    const model = config.models.find((m) => m.id === modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not available for provider ${providerId}`);
    }
    const provider = this.providers.get(providerId);
    provider.currentModel = modelId;
    if (providerId === this.currentProvider) {
      this.currentModel = modelId;
      const keyData = await this.secureKeyManager.getProviderKey(providerId);
      provider.instance = await this.createProvider(providerId, keyData.api_key);
      provider.instance.model = modelId;
    }
    return true;
  }
  /**
   * Cleanup and destroy
   */
  async destroy() {
    try {
      this.providers.clear();
      this.currentProvider = null;
      this.currentModel = null;
      this.isInitialized = false;
    } catch (error) {
    }
  }
}
class ChatHistoryStore {
  constructor(options = {}) {
    this.options = {
      name: options.name || "chat-history",
      fileExtension: options.fileExtension || "json",
      clearInvalidConfig: options.clearInvalidConfig !== false,
      migrations: {
        "1.0.0": (store2) => {
          if (!store2.has("conversations")) {
            store2.set("conversations", {});
          }
          if (!store2.has("metadata")) {
            store2.set("metadata", {
              version: "1.0.0",
              createdAt: Date.now(),
              totalConversations: 0,
              lastBackup: null
            });
          }
        }
      },
      schema: {
        conversations: {
          type: "object",
          additionalProperties: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              messages: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    sessionId: { type: "string" },
                    parentUuid: { type: "string" },
                    role: {
                      type: "string",
                      enum: ["user", "assistant", "system"]
                    },
                    content: { type: "string" },
                    timestamp: { type: "number" },
                    metadata: { type: "object" }
                  },
                  required: ["id", "role", "content", "timestamp"]
                }
              },
              createdAt: { type: "number" },
              updatedAt: { type: "number" },
              metadata: { type: "object" }
            },
            required: ["id", "title", "messages", "createdAt", "updatedAt"]
          }
        },
        metadata: {
          type: "object",
          properties: {
            version: { type: "string" },
            createdAt: { type: "number" },
            totalConversations: { type: "number" },
            lastBackup: { type: ["number", "null"] }
          }
        },
        sessions: {
          type: "object",
          additionalProperties: {
            type: "object",
            properties: {
              id: { type: "string" },
              conversationId: { type: "string" },
              startedAt: { type: "number" },
              lastActiveAt: { type: "number" },
              commandHistory: { type: "array" },
              workingDirectory: { type: "string" },
              gitBranch: { type: "string" },
              isActive: { type: "boolean" }
            }
          }
        }
      },
      ...options
    };
    this.isInitialized = false;
    this.store = null;
    this.backupInterval = null;
    this.ipcHandlers = /* @__PURE__ */ new Map();
  }
  /**
   * Initialize the chat history store
   */
  async initialize() {
    try {
      this.store = new Store(this.options);
      this.setupIPCHandlers();
      this.startBackupTimer();
      await this.validateAndRepairData();
      this.isInitialized = true;
      return true;
    } catch (error) {
      throw error;
    }
  }
  /**
   * Set up IPC handlers for renderer process communication
   */
  setupIPCHandlers() {
    const handlers = {
      "chat-history:save-conversation": this.handleSaveConversation.bind(this),
      "chat-history:load-conversation": this.handleLoadConversation.bind(this),
      "chat-history:list-conversations": this.handleListConversations.bind(this),
      "chat-history:delete-conversation": this.handleDeleteConversation.bind(this),
      "chat-history:search-conversations": this.handleSearchConversations.bind(this),
      "chat-history:add-message": this.handleAddMessage.bind(this),
      "chat-history:update-message": this.handleUpdateMessage.bind(this),
      "chat-history:delete-message": this.handleDeleteMessage.bind(this),
      "chat-history:create-session": this.handleCreateSession.bind(this),
      "chat-history:update-session": this.handleUpdateSession.bind(this),
      "chat-history:list-sessions": this.handleListSessions.bind(this),
      "chat-history:export-data": this.handleExportData.bind(this),
      "chat-history:import-data": this.handleImportData.bind(this),
      "chat-history:backup": this.handleBackup.bind(this),
      "chat-history:restore": this.handleRestore.bind(this),
      "chat-history:get-metadata": this.handleGetMetadata.bind(this),
      "chat-history:cleanup": this.handleCleanup.bind(this)
    };
    Object.entries(handlers).forEach(([channel, handler]) => {
      electron.ipcMain.handle(channel, handler);
      this.ipcHandlers.set(channel, handler);
    });
  }
  /**
   * Save conversation to storage
   */
  async handleSaveConversation(event, conversationData) {
    try {
      if (!this.isInitialized) {
        throw new Error("ChatHistoryStore not initialized");
      }
      const conversationId = conversationData.id;
      if (!conversationId) {
        throw new Error("Conversation ID is required");
      }
      const conversations = this.store.get("conversations", {});
      const isNew = !conversations[conversationId];
      const validatedConversation = this.validateConversationData(conversationData);
      conversations[conversationId] = validatedConversation;
      this.store.set("conversations", conversations);
      if (isNew) {
        const metadata = this.store.get("metadata", {});
        metadata.totalConversations = Object.keys(conversations).length;
        metadata.lastModified = Date.now();
        this.store.set("metadata", metadata);
      }
      return {
        success: true,
        conversationId,
        isNew,
        messageCount: validatedConversation.messages.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Load conversation from storage
   */
  async handleLoadConversation(event, conversationId) {
    try {
      if (!conversationId) {
        throw new Error("Conversation ID is required");
      }
      const conversations = this.store.get("conversations", {});
      const conversation = conversations[conversationId];
      if (!conversation) {
        return {
          success: false,
          error: "Conversation not found"
        };
      }
      return {
        success: true,
        conversation
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * List all conversations with pagination and sorting
   */
  async handleListConversations(event, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        sortBy = "updatedAt",
        sortOrder = "desc",
        includeMessages = false
      } = options;
      const conversations = this.store.get("conversations", {});
      let conversationList = Object.values(conversations);
      conversationList.sort((a, b) => {
        const aValue = a[sortBy] || 0;
        const bValue = b[sortBy] || 0;
        return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
      });
      const total = conversationList.length;
      const paginatedList = conversationList.slice(offset, offset + limit);
      if (!includeMessages) {
        paginatedList.forEach((conv) => {
          conv.messageCount = conv.messages.length;
          delete conv.messages;
        });
      }
      return {
        success: true,
        conversations: paginatedList,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Delete conversation from storage
   */
  async handleDeleteConversation(event, conversationId) {
    try {
      if (!conversationId) {
        throw new Error("Conversation ID is required");
      }
      const conversations = this.store.get("conversations", {});
      if (!conversations[conversationId]) {
        return {
          success: false,
          error: "Conversation not found"
        };
      }
      const deletedConversation = conversations[conversationId];
      delete conversations[conversationId];
      this.store.set("conversations", conversations);
      const metadata = this.store.get("metadata", {});
      metadata.totalConversations = Object.keys(conversations).length;
      metadata.lastModified = Date.now();
      this.store.set("metadata", metadata);
      return {
        success: true,
        conversationId,
        deletedConversation: {
          id: deletedConversation.id,
          title: deletedConversation.title,
          messageCount: deletedConversation.messages.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Search conversations and messages
   */
  async handleSearchConversations(event, searchOptions) {
    try {
      const {
        query,
        searchType = "all",
        // 'title', 'content', 'all'
        limit = 20,
        includeMessages = true
      } = searchOptions;
      if (!query || query.trim().length < 2) {
        throw new Error("Search query must be at least 2 characters");
      }
      const conversations = this.store.get("conversations", {});
      const searchTerm = query.toLowerCase();
      const results = {
        conversations: [],
        messages: [],
        totalFound: 0
      };
      Object.values(conversations).forEach((conversation) => {
        let conversationScore = 0;
        const matchingMessages = [];
        if ((searchType === "title" || searchType === "all") && conversation.title.toLowerCase().includes(searchTerm)) {
          conversationScore += 10;
        }
        if ((searchType === "content" || searchType === "all") && includeMessages) {
          conversation.messages.forEach((message) => {
            if (message.content.toLowerCase().includes(searchTerm)) {
              matchingMessages.push({
                ...message,
                conversationId: conversation.id,
                conversationTitle: conversation.title
              });
              conversationScore += 1;
            }
          });
        }
        if (conversationScore > 0) {
          results.conversations.push({
            ...conversation,
            score: conversationScore,
            matchingMessageCount: matchingMessages.length,
            messages: includeMessages ? matchingMessages : void 0
          });
          results.messages.push(...matchingMessages);
        }
      });
      results.conversations.sort((a, b) => b.score - a.score);
      results.messages.sort((a, b) => b.timestamp - a.timestamp);
      results.conversations = results.conversations.slice(0, limit);
      results.messages = results.messages.slice(0, limit * 2);
      results.totalFound = results.conversations.length;
      return {
        success: true,
        query,
        results
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Add message to conversation
   */
  async handleAddMessage(event, messageData) {
    try {
      const { conversationId, message } = messageData;
      if (!conversationId || !message) {
        throw new Error("Conversation ID and message are required");
      }
      const conversations = this.store.get("conversations", {});
      const conversation = conversations[conversationId];
      if (!conversation) {
        throw new Error("Conversation not found");
      }
      const validatedMessage = this.validateMessageData(message);
      conversation.messages.push(validatedMessage);
      conversation.updatedAt = Date.now();
      conversation.metadata.messageCount = conversation.messages.length;
      conversations[conversationId] = conversation;
      this.store.set("conversations", conversations);
      return {
        success: true,
        conversationId,
        messageId: validatedMessage.id,
        messageCount: conversation.messages.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Update existing message
   */
  async handleUpdateMessage(event, updateData) {
    try {
      const { conversationId, messageId, updates } = updateData;
      if (!conversationId || !messageId || !updates) {
        throw new Error("Conversation ID, message ID, and updates are required");
      }
      const conversations = this.store.get("conversations", {});
      const conversation = conversations[conversationId];
      if (!conversation) {
        throw new Error("Conversation not found");
      }
      const messageIndex = conversation.messages.findIndex((msg) => msg.id === messageId);
      if (messageIndex === -1) {
        throw new Error("Message not found");
      }
      conversation.messages[messageIndex] = {
        ...conversation.messages[messageIndex],
        ...updates,
        updatedAt: Date.now()
      };
      conversation.updatedAt = Date.now();
      conversations[conversationId] = conversation;
      this.store.set("conversations", conversations);
      return {
        success: true,
        conversationId,
        messageId,
        updatedMessage: conversation.messages[messageIndex]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Delete message from conversation
   */
  async handleDeleteMessage(event, deleteData) {
    try {
      const { conversationId, messageId } = deleteData;
      if (!conversationId || !messageId) {
        throw new Error("Conversation ID and message ID are required");
      }
      const conversations = this.store.get("conversations", {});
      const conversation = conversations[conversationId];
      if (!conversation) {
        throw new Error("Conversation not found");
      }
      const messageIndex = conversation.messages.findIndex((msg) => msg.id === messageId);
      if (messageIndex === -1) {
        throw new Error("Message not found");
      }
      const deletedMessage = conversation.messages.splice(messageIndex, 1)[0];
      conversation.updatedAt = Date.now();
      conversation.metadata.messageCount = conversation.messages.length;
      conversations[conversationId] = conversation;
      this.store.set("conversations", conversations);
      return {
        success: true,
        conversationId,
        messageId,
        deletedMessage,
        remainingMessages: conversation.messages.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Create Claude Code CLI session
   */
  async handleCreateSession(event, sessionData) {
    try {
      const sessionId = sessionData.id || this.generateSessionId();
      const session = {
        id: sessionId,
        conversationId: sessionData.conversationId,
        startedAt: Date.now(),
        lastActiveAt: Date.now(),
        commandHistory: [],
        workingDirectory: sessionData.workingDirectory || process.cwd(),
        gitBranch: sessionData.gitBranch || "main",
        isActive: true,
        metadata: sessionData.metadata || {}
      };
      const sessions = this.store.get("sessions", {});
      sessions[sessionId] = session;
      this.store.set("sessions", sessions);
      return {
        success: true,
        sessionId,
        session
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Update session data
   */
  async handleUpdateSession(event, updateData) {
    try {
      const { sessionId, updates } = updateData;
      if (!sessionId) {
        throw new Error("Session ID is required");
      }
      const sessions = this.store.get("sessions", {});
      const session = sessions[sessionId];
      if (!session) {
        throw new Error("Session not found");
      }
      sessions[sessionId] = {
        ...session,
        ...updates,
        lastActiveAt: Date.now()
      };
      this.store.set("sessions", sessions);
      return {
        success: true,
        sessionId,
        session: sessions[sessionId]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * List all sessions
   */
  async handleListSessions(event, options = {}) {
    try {
      const { activeOnly = false, limit = 20 } = options;
      const sessions = this.store.get("sessions", {});
      let sessionList = Object.values(sessions);
      if (activeOnly) {
        sessionList = sessionList.filter((session) => session.isActive);
      }
      sessionList.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
      if (limit) {
        sessionList = sessionList.slice(0, limit);
      }
      return {
        success: true,
        sessions: sessionList,
        total: Object.keys(sessions).length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Export chat history data
   */
  async handleExportData(event, exportOptions = {}) {
    try {
      const { format = "json", conversationIds = null } = exportOptions;
      const conversations = this.store.get("conversations", {});
      const sessions = this.store.get("sessions", {});
      const metadata = this.store.get("metadata", {});
      let exportData = {
        metadata: {
          ...metadata,
          exportedAt: Date.now(),
          exportFormat: format,
          version: "1.0.0"
        },
        conversations: conversationIds ? Object.fromEntries(
          Object.entries(conversations).filter(([id]) => conversationIds.includes(id))
        ) : conversations,
        sessions
      };
      if (format === "jsonl") {
        exportData = this.convertToJSONL(exportData);
      }
      return {
        success: true,
        data: exportData,
        format,
        conversationCount: Object.keys(exportData.conversations || {}).length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Import chat history data
   */
  async handleImportData(event, importOptions) {
    try {
      const { data, format = "json", merge = true } = importOptions;
      if (!data) {
        throw new Error("Import data is required");
      }
      let importData = data;
      if (format === "jsonl") {
        importData = this.parseJSONL(data);
      }
      const currentConversations = merge ? this.store.get("conversations", {}) : {};
      const currentSessions = merge ? this.store.get("sessions", {}) : {};
      const newConversations = {
        ...currentConversations,
        ...importData.conversations || {}
      };
      const newSessions = {
        ...currentSessions,
        ...importData.sessions || {}
      };
      this.store.set("conversations", newConversations);
      this.store.set("sessions", newSessions);
      const metadata = this.store.get("metadata", {});
      metadata.totalConversations = Object.keys(newConversations).length;
      metadata.lastImport = Date.now();
      this.store.set("metadata", metadata);
      const importedCount = Object.keys(importData.conversations || {}).length;
      return {
        success: true,
        importedConversations: importedCount,
        totalConversations: Object.keys(newConversations).length,
        merged: merge
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Create backup of chat history
   */
  async handleBackup(event, backupOptions = {}) {
    try {
      const { includeMetadata = true } = backupOptions;
      const timestamp = Date.now();
      const backupData = {
        conversations: this.store.get("conversations", {}),
        sessions: this.store.get("sessions", {}),
        metadata: includeMetadata ? {
          ...this.store.get("metadata", {}),
          backupCreatedAt: timestamp
        } : void 0
      };
      const metadata = this.store.get("metadata", {});
      metadata.lastBackup = timestamp;
      this.store.set("metadata", metadata);
      return {
        success: true,
        backupData,
        timestamp,
        conversationCount: Object.keys(backupData.conversations).length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Restore from backup
   */
  async handleRestore(event, restoreOptions) {
    try {
      const { backupData, merge = false } = restoreOptions;
      if (!backupData) {
        throw new Error("Backup data is required");
      }
      if (!merge) {
        this.store.set("conversations", backupData.conversations || {});
        this.store.set("sessions", backupData.sessions || {});
        if (backupData.metadata) {
          this.store.set("metadata", {
            ...backupData.metadata,
            restoredAt: Date.now()
          });
        }
      } else {
        const currentConversations = this.store.get("conversations", {});
        const currentSessions = this.store.get("sessions", {});
        this.store.set("conversations", {
          ...currentConversations,
          ...backupData.conversations || {}
        });
        this.store.set("sessions", {
          ...currentSessions,
          ...backupData.sessions || {}
        });
      }
      const conversationCount = Object.keys(this.store.get("conversations", {})).length;
      return {
        success: true,
        restoredConversations: Object.keys(backupData.conversations || {}).length,
        totalConversations: conversationCount,
        merged: merge
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Get metadata and statistics
   */
  async handleGetMetadata(event) {
    try {
      const conversations = this.store.get("conversations", {});
      const sessions = this.store.get("sessions", {});
      const metadata = this.store.get("metadata", {});
      const stats = {
        ...metadata,
        totalConversations: Object.keys(conversations).length,
        totalSessions: Object.keys(sessions).length,
        totalMessages: Object.values(conversations).reduce(
          (sum, conv) => sum + conv.messages.length,
          0
        ),
        activeSessions: Object.values(sessions).filter((s) => s.isActive).length,
        storageSize: this.store.size,
        lastAccessed: Date.now()
      };
      return {
        success: true,
        metadata: stats
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Clean up old data based on retention policies
   */
  async handleCleanup(event, cleanupOptions = {}) {
    try {
      const {
        retentionDays = 30,
        maxConversations = 1e3,
        deleteEmpty = true
      } = cleanupOptions;
      const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1e3;
      const conversations = this.store.get("conversations", {});
      const sessions = this.store.get("sessions", {});
      let deletedConversations = 0;
      let deletedSessions = 0;
      Object.entries(conversations).forEach(([id, conversation]) => {
        const shouldDelete = conversation.updatedAt < cutoffTime || deleteEmpty && conversation.messages.length === 0;
        if (shouldDelete) {
          delete conversations[id];
          deletedConversations++;
        }
      });
      Object.entries(sessions).forEach(([id, session]) => {
        if (session.lastActiveAt < cutoffTime || !conversations[session.conversationId]) {
          delete sessions[id];
          deletedSessions++;
        }
      });
      const conversationList = Object.entries(conversations);
      if (conversationList.length > maxConversations) {
        conversationList.sort(([, a], [, b]) => a.updatedAt - b.updatedAt).slice(0, conversationList.length - maxConversations).forEach(([id]) => {
          delete conversations[id];
          deletedConversations++;
        });
      }
      this.store.set("conversations", conversations);
      this.store.set("sessions", sessions);
      const metadata = this.store.get("metadata", {});
      metadata.totalConversations = Object.keys(conversations).length;
      metadata.lastCleanup = Date.now();
      this.store.set("metadata", metadata);
      return {
        success: true,
        deletedConversations,
        deletedSessions,
        remainingConversations: Object.keys(conversations).length,
        remainingSessions: Object.keys(sessions).length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Validate conversation data structure
   */
  validateConversationData(conversationData) {
    const required = ["id", "title", "messages", "createdAt", "updatedAt"];
    for (const field of required) {
      if (!conversationData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    return {
      id: conversationData.id,
      title: conversationData.title,
      messages: conversationData.messages.map((msg) => this.validateMessageData(msg)),
      createdAt: conversationData.createdAt,
      updatedAt: conversationData.updatedAt,
      metadata: conversationData.metadata || {}
    };
  }
  /**
   * Validate message data structure (Claude Code CLI compatible)
   */
  validateMessageData(messageData) {
    const messageId = messageData.id || this.generateMessageId();
    const timestamp = messageData.timestamp || Date.now();
    return {
      id: messageId,
      sessionId: messageData.sessionId || messageData.conversationId,
      parentUuid: messageData.parentUuid || null,
      role: messageData.role || "user",
      content: messageData.content || "",
      timestamp,
      metadata: {
        cwd: messageData.metadata?.cwd || process.cwd(),
        gitBranch: messageData.metadata?.gitBranch || "main",
        version: messageData.metadata?.version || "1.0.0",
        userType: messageData.metadata?.userType || "external",
        ...messageData.metadata
      }
    };
  }
  /**
   * Convert data to JSONL format for Claude Code compatibility
   */
  convertToJSONL(data) {
    const jsonlLines = [];
    jsonlLines.push(JSON.stringify({
      type: "metadata",
      ...data.metadata
    }));
    Object.values(data.conversations || {}).forEach((conversation) => {
      jsonlLines.push(JSON.stringify({
        type: "conversation",
        ...conversation
      }));
    });
    return jsonlLines.join("\n");
  }
  /**
   * Parse JSONL format data
   */
  parseJSONL(jsonlData) {
    const lines = jsonlData.split("\n").filter((line) => line.trim());
    const result = {
      conversations: {},
      sessions: {},
      metadata: {}
    };
    lines.forEach((line) => {
      try {
        const data = JSON.parse(line);
        if (data.type === "metadata") {
          result.metadata = data;
        } else if (data.type === "conversation") {
          result.conversations[data.id] = data;
        } else if (data.type === "session") {
          result.sessions[data.id] = data;
        }
      } catch (error) {
      }
    });
    return result;
  }
  /**
   * Validate and repair data integrity
   */
  async validateAndRepairData() {
    try {
      const conversations = this.store.get("conversations", {});
      const sessions = this.store.get("sessions", {});
      let repaired = false;
      Object.entries(conversations).forEach(([id, conversation]) => {
        if (!conversation.id || conversation.id !== id) {
          conversation.id = id;
          repaired = true;
        }
        if (!conversation.messages) {
          conversation.messages = [];
          repaired = true;
        }
        if (!conversation.metadata) {
          conversation.metadata = {
            messageCount: conversation.messages.length
          };
          repaired = true;
        }
      });
      Object.entries(sessions).forEach(([id, session]) => {
        if (!session.id || session.id !== id) {
          session.id = id;
          repaired = true;
        }
        if (session.conversationId && !conversations[session.conversationId]) {
          delete sessions[id];
          repaired = true;
        }
      });
      if (repaired) {
        this.store.set("conversations", conversations);
        this.store.set("sessions", sessions);
      }
    } catch (error) {
    }
  }
  /**
   * Start automatic backup timer
   */
  startBackupTimer() {
    this.backupInterval = setInterval(async () => {
      try {
        await this.handleBackup(null, { includeMetadata: true });
      } catch (error) {
      }
    }, 6 * 60 * 60 * 1e3);
  }
  /**
   * Generate unique conversation ID following Claude Code format
   */
  generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
  /**
   * Generate unique message ID following Claude Code format
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
  /**
   * Generate unique session ID following Claude Code format
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
  /**
   * Get store file path for debugging
   */
  getStorePath() {
    return this.store ? this.store.path : null;
  }
  /**
   * Get store statistics
   */
  getStoreStats() {
    return {
      isInitialized: this.isInitialized,
      storePath: this.getStorePath(),
      storeSize: this.store ? this.store.size : 0,
      ipcHandlerCount: this.ipcHandlers.size
    };
  }
  /**
   * Destroy the store and clean up resources
   */
  async destroy() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
    this.ipcHandlers.forEach((handler, channel) => {
      electron.ipcMain.removeHandler(channel);
    });
    this.ipcHandlers.clear();
    this.isInitialized = false;
    this.store = null;
  }
}
class SecureKeyManager {
  constructor() {
    this.configPath = path.join(electron.app.getPath("userData"), "provider-keys.enc");
    this.configBackupPath = path.join(electron.app.getPath("userData"), "provider-keys.backup.enc");
    this.providers = /* @__PURE__ */ new Map();
    this.isInitialized = false;
    this.encryptionKey = null;
    this.supportedProviders = {
      "claude": {
        name: "Claude (Anthropic)",
        keyNames: ["api_key"],
        models: ["claude-3-sonnet-20240229", "claude-3-haiku-20240307", "claude-3-opus-20240229"],
        defaultModel: "claude-3-sonnet-20240229",
        endpoints: {
          api: "https://api.anthropic.com",
          chat: "/v1/messages"
        },
        costPer1k: { input: 3e-3, output: 0.015 }
      },
      "openai": {
        name: "OpenAI",
        keyNames: ["api_key"],
        models: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
        defaultModel: "gpt-4",
        endpoints: {
          api: "https://api.openai.com",
          chat: "/v1/chat/completions"
        },
        costPer1k: { input: 0.01, output: 0.03 }
      },
      "gemini": {
        name: "Google Gemini",
        keyNames: ["api_key"],
        models: ["gemini-pro", "gemini-pro-vision"],
        defaultModel: "gemini-pro",
        endpoints: {
          api: "https://generativelanguage.googleapis.com",
          chat: "/v1beta/models/{model}:generateContent"
        },
        costPer1k: { input: 125e-5, output: 375e-5 }
      }
    };
  }
  /**
   * Initialize the secure key manager
   */
  async initialize() {
    try {
      console.log("🔐 SecureKeyManager: Starting initialization...");
      if (!electron.safeStorage.isEncryptionAvailable()) {
        console.error("❌ SecureKeyManager: System encryption is not available");
        throw new Error("System encryption is not available");
      }
      console.log("✅ SecureKeyManager: System encryption is available");
      await this.initializeEncryption();
      console.log("✅ SecureKeyManager: Encryption initialized");
      await this.loadProviderConfigs();
      console.log("✅ SecureKeyManager: Provider configs loaded");
      this.isInitialized = true;
      console.log("✅ SecureKeyManager: Set as initialized");
      await this.loadEnvironmentVariables();
      console.log("✅ SecureKeyManager: Environment variables processed");
      console.log("📊 SecureKeyManager: Initialization complete. Summary:", {
        isInitialized: this.isInitialized,
        providersCount: this.providers.size,
        providers: Array.from(this.providers.keys())
      });
      return true;
    } catch (error) {
      console.error("❌ SecureKeyManager: Initialization failed:", error);
      this.isInitialized = false;
      throw error;
    }
  }
  /**
   * Initialize encryption system
   */
  async initializeEncryption() {
    try {
      const keyPath = path.join(electron.app.getPath("userData"), ".keystore");
      try {
        const existingKey = await fs.readFile(keyPath);
        this.encryptionKey = existingKey;
      } catch (error) {
        this.encryptionKey = crypto.randomBytes(32);
        await fs.writeFile(keyPath, this.encryptionKey, { mode: 384 });
      }
    } catch (error) {
      throw error;
    }
  }
  /**
   * Store API key for a provider
   */
  async storeProviderKey(providerId, keyData) {
    if (!this.isInitialized) {
      throw new Error("SecureKeyManager not initialized");
    }
    if (!this.supportedProviders[providerId]) {
      throw new Error(`Unsupported provider: ${providerId}`);
    }
    try {
      this.validateKeyData(providerId, keyData);
      const encryptedData = this.encryptData(keyData);
      this.providers.set(providerId, {
        ...keyData,
        encrypted: encryptedData,
        createdAt: Date.now(),
        lastUsed: null,
        status: "stored"
      });
      await this.saveProviderConfigs();
      return true;
    } catch (error) {
      throw error;
    }
  }
  /**
   * Retrieve API key for a provider
   */
  async getProviderKey(providerId) {
    console.log(`🔓 SecureKeyManager: Getting provider key for ${providerId}`);
    if (!this.isInitialized) {
      console.error("❌ SecureKeyManager: Not initialized when getting provider key");
      throw new Error("SecureKeyManager not initialized");
    }
    const providerData = this.providers.get(providerId);
    if (!providerData) {
      console.log(`⚠️ SecureKeyManager: No provider data found for ${providerId}`);
      return null;
    }
    console.log(`✅ SecureKeyManager: Found provider data for ${providerId}`);
    try {
      console.log(`🔓 SecureKeyManager: Decrypting key data for ${providerId}`);
      const decryptedData = this.decryptData(providerData.encrypted);
      console.log(`✅ SecureKeyManager: Successfully decrypted key for ${providerId}, key length:`, decryptedData.api_key?.length || 0);
      providerData.lastUsed = Date.now();
      return decryptedData;
    } catch (error) {
      console.error(`❌ SecureKeyManager: Failed to decrypt key for ${providerId}:`, error.message);
      throw error;
    }
  }
  /**
   * Remove API key for a provider
   */
  async removeProviderKey(providerId) {
    if (!this.isInitialized) {
      throw new Error("SecureKeyManager not initialized");
    }
    try {
      this.providers.delete(providerId);
      await this.saveProviderConfigs();
      return true;
    } catch (error) {
      throw error;
    }
  }
  /**
   * Check if provider has stored key
   */
  hasProviderKey(providerId) {
    const hasKey = this.providers.has(providerId);
    console.log(`🔑 SecureKeyManager: Provider ${providerId} has key: ${hasKey}`);
    return hasKey;
  }
  /**
   * Get provider configuration information
   */
  getProviderInfo(providerId) {
    const config = this.supportedProviders[providerId];
    if (!config) {
      return null;
    }
    const hasKey = this.hasProviderKey(providerId);
    const providerData = this.providers.get(providerId);
    return {
      id: providerId,
      name: config.name,
      models: config.models,
      defaultModel: config.defaultModel,
      endpoints: config.endpoints,
      costPer1k: config.costPer1k,
      hasKey,
      keyStatus: hasKey ? providerData.status : "missing",
      lastUsed: hasKey ? providerData.lastUsed : null,
      createdAt: hasKey ? providerData.createdAt : null
    };
  }
  /**
   * Get all supported providers
   */
  getAllProviders() {
    return Object.keys(this.supportedProviders).map(
      (providerId) => this.getProviderInfo(providerId)
    );
  }
  /**
   * Test provider API key
   */
  async testProviderKey(providerId) {
    if (!this.hasProviderKey(providerId)) {
      throw new Error(`No API key stored for provider: ${providerId}`);
    }
    try {
      const keyData = await this.getProviderKey(providerId);
      const config = this.supportedProviders[providerId];
      let testResult;
      switch (providerId) {
        case "claude":
          testResult = await this.testClaudeAPI(keyData.api_key);
          break;
        case "openai":
          testResult = await this.testOpenAIAPI(keyData.api_key);
          break;
        case "gemini":
          testResult = await this.testGeminiAPI(keyData.api_key);
          break;
        default:
          throw new Error(`API test not implemented for provider: ${providerId}`);
      }
      const providerData = this.providers.get(providerId);
      if (providerData) {
        providerData.status = testResult.success ? "active" : "invalid";
        providerData.lastTested = Date.now();
        providerData.testResult = testResult;
      }
      return testResult;
    } catch (error) {
      const providerData = this.providers.get(providerId);
      if (providerData) {
        providerData.status = "error";
        providerData.lastTested = Date.now();
        providerData.testError = error.message;
      }
      throw error;
    }
  }
  /**
   * Update provider configuration
   */
  async updateProviderConfig(providerId, config) {
    if (!this.hasProviderKey(providerId)) {
      throw new Error(`No API key stored for provider: ${providerId}`);
    }
    const providerData = this.providers.get(providerId);
    Object.assign(providerData, {
      ...config,
      updatedAt: Date.now()
    });
    await this.saveProviderConfigs();
    return true;
  }
  /**
   * Get provider usage statistics
   */
  getProviderStats() {
    const stats = {
      totalProviders: Object.keys(this.supportedProviders).length,
      configuredProviders: this.providers.size,
      providerStatus: {}
    };
    for (const [providerId, data] of this.providers) {
      stats.providerStatus[providerId] = {
        status: data.status,
        lastUsed: data.lastUsed,
        lastTested: data.lastTested,
        createdAt: data.createdAt
      };
    }
    return stats;
  }
  /**
   * Export provider configurations (without keys)
   */
  async exportConfig() {
    const exportData = {
      version: "1.0",
      exportedAt: Date.now(),
      providers: {}
    };
    for (const [providerId, data] of this.providers) {
      exportData.providers[providerId] = {
        status: data.status,
        createdAt: data.createdAt,
        lastUsed: data.lastUsed,
        lastTested: data.lastTested,
        // Exclude encrypted keys from export
        hasKey: true
      };
    }
    return exportData;
  }
  /**
   * Import provider configurations
   */
  async importConfig(importData) {
    if (!importData.version || !importData.providers) {
      throw new Error("Invalid import data format");
    }
    let importedCount = 0;
    for (const [providerId, config] of Object.entries(importData.providers)) {
      if (this.supportedProviders[providerId] && !this.providers.has(providerId)) {
        this.providers.set(providerId, {
          ...config,
          status: "imported",
          importedAt: Date.now()
        });
        importedCount++;
      }
    }
    if (importedCount > 0) {
      await this.saveProviderConfigs();
    }
    return importedCount;
  }
  /**
   * Load API keys from environment variables and auto-store them
   */
  async loadEnvironmentVariables() {
    try {
      console.log("🌍 SecureKeyManager: Loading environment variables...");
      const environmentMappings = {
        "claude": "CLAUDE_API_KEY",
        "openai": "OPENAI_API_KEY",
        "gemini": "GEMINI_API_KEY"
      };
      let autoStoredCount = 0;
      console.log("🔍 SecureKeyManager: Checking environment variables for providers...");
      for (const [providerId, envVarName] of Object.entries(environmentMappings)) {
        console.log(`🔍 SecureKeyManager: Checking ${envVarName} for provider ${providerId}`);
        const envValue = process.env[envVarName];
        if (envValue && envValue.trim()) {
          console.log(`✅ SecureKeyManager: Found ${envVarName} with length: ${envValue.trim().length}`);
          if (!this.hasProviderKey(providerId)) {
            try {
              console.log(`💾 SecureKeyManager: Auto-storing key for ${providerId} from ${envVarName}`);
              const keyData = { api_key: envValue.trim() };
              await this.storeProviderKey(providerId, keyData);
              console.log(`✅ SecureKeyManager: Successfully auto-stored key for ${providerId}`);
              autoStoredCount++;
            } catch (error) {
              console.error(`❌ SecureKeyManager: Failed to auto-store key for ${providerId}:`, error.message);
            }
          } else {
            console.log(`📝 SecureKeyManager: Provider ${providerId} already has stored key, skipping env variable`);
          }
        } else {
          console.log(`⚠️ SecureKeyManager: No value found for ${envVarName}`);
        }
      }
      if (autoStoredCount > 0) {
        console.log(`✅ SecureKeyManager: Auto-stored ${autoStoredCount} API keys from environment variables`);
      } else {
        console.log("📝 SecureKeyManager: No new API keys auto-stored from environment variables");
      }
    } catch (error) {
      console.error("❌ SecureKeyManager: Error loading environment variables:", error);
    }
  }
  /**
   * Private helper methods
   */
  validateKeyData(providerId, keyData) {
    const config = this.supportedProviders[providerId];
    for (const keyName of config.keyNames) {
      if (!keyData[keyName] || typeof keyData[keyName] !== "string") {
        throw new Error(`Missing or invalid ${keyName} for provider ${providerId}`);
      }
    }
    switch (providerId) {
      case "claude":
        if (!keyData.api_key.startsWith("sk-ant-")) {
          throw new Error("Invalid Claude API key format");
        }
        break;
      case "openai":
        if (!keyData.api_key.startsWith("sk-")) {
          throw new Error("Invalid OpenAI API key format");
        }
        break;
      case "gemini":
        if (keyData.api_key.length < 30) {
          throw new Error("Invalid Gemini API key format");
        }
        break;
    }
  }
  encryptData(data) {
    try {
      const jsonData = JSON.stringify(data);
      const encryptedBuffer = electron.safeStorage.encryptString(jsonData);
      return encryptedBuffer.toString("base64");
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }
  decryptData(encryptedData) {
    try {
      const encryptedBuffer = Buffer.from(encryptedData, "base64");
      const decryptedString = electron.safeStorage.decryptString(encryptedBuffer);
      return JSON.parse(decryptedString);
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }
  async loadProviderConfigs() {
    try {
      const configData = await fs.readFile(this.configPath);
      const configs = JSON.parse(configData.toString());
      for (const [providerId, config] of Object.entries(configs)) {
        if (this.supportedProviders[providerId]) {
          if (config.encrypted && typeof config.encrypted === "object" && config.encrypted.type === "Buffer") {
            config.encrypted = Buffer.from(config.encrypted.data).toString("base64");
          }
          this.providers.set(providerId, config);
        }
      }
      if (this.providers.size > 0) {
        await this.saveProviderConfigs();
      }
    } catch (error) {
      if (error.code !== "ENOENT") ;
    }
  }
  async saveProviderConfigs() {
    try {
      try {
        await fs.copyFile(this.configPath, this.configBackupPath);
      } catch (backupError) {
      }
      const configs = {};
      for (const [providerId, data] of this.providers) {
        configs[providerId] = data;
      }
      await fs.writeFile(this.configPath, JSON.stringify(configs, null, 2), { mode: 384 });
    } catch (error) {
      throw error;
    }
  }
  /**
   * API Testing Methods
   */
  async testClaudeAPI(apiKey) {
    return {
      success: true,
      provider: "claude",
      message: "API key is valid",
      models: this.supportedProviders.claude.models
    };
  }
  async testOpenAIAPI(apiKey) {
    return {
      success: true,
      provider: "openai",
      message: "API key is valid",
      models: this.supportedProviders.openai.models
    };
  }
  async testGeminiAPI(apiKey) {
    return {
      success: true,
      provider: "gemini",
      message: "API key is valid",
      models: this.supportedProviders.gemini.models
    };
  }
  /**
   * Cleanup and destroy
   */
  async destroy() {
    try {
      this.providers.clear();
      this.encryptionKey = null;
      this.isInitialized = false;
    } catch (error) {
    }
  }
}
const __dirname$1 = path.dirname(require$$5.fileURLToPath(require("url").pathToFileURL(__filename).href));
dotenv.config({ path: path.join(__dirname$1, "../../.env") });
const store = new Store();
electron.app.commandLine.appendSwitch("disable-gpu");
electron.app.commandLine.appendSwitch("disable-software-rasterizer");
electron.app.commandLine.appendSwitch("disable-gpu-compositing");
electron.app.commandLine.appendSwitch("enable-features", "OverlayScrollbar");
electron.app.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion");
process.on("uncaughtException", (error) => {
});
process.on("unhandledRejection", (reason, promise) => {
});
electron.app.on("render-process-gone", (event, webContents, details) => {
});
class EGDeskTaehwa {
  constructor() {
    this.mainWindow = null;
    this.webContentsManager = new WebContentsManager();
    this.langChainService = null;
    this.chatHistoryStore = new ChatHistoryStore();
    this.secureKeyManager = new SecureKeyManager();
    this.currentWorkspace = "start";
    this.currentTabId = null;
    this.setupApp();
  }
  setupApp() {
    electron.app.whenReady().then(async () => {
      try {
        await this.chatHistoryStore.initialize();
      } catch (error) {
      }
      try {
        await this.secureKeyManager.initialize();
        this.langChainService = new LangChainService(this.secureKeyManager);
        await this.langChainService.initialize();
      } catch (error) {
      }
      this.createMainWindow();
      if (this.langChainService && this.mainWindow) {
        await this.langChainService.setElectronWindow(this.mainWindow);
      }
      this.setupMenu();
      this.setupIPC();
    });
    electron.app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        electron.app.quit();
      }
    });
    electron.app.on("activate", () => {
      if (electron.BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });
  }
  createMainWindow() {
    this.mainWindow = new electron.BrowserWindow({
      width: 1600,
      height: 1e3,
      minWidth: 1280,
      minHeight: 800,
      titleBarStyle: "hiddenInset",
      title: "",
      icon: path.join(__dirname$1, "assets/icon.png"),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname$1, "../preload/index.js"),
        webSecurity: true,
        sandbox: false,
        // Allow JavaScript execution in renderer
        // Additional GPU optimization flags
        disableHardwareAcceleration: false,
        // Keep hardware acceleration for performance
        offscreen: false
        // Disable offscreen rendering which can cause GL issues
      },
      // Window-level GPU optimization
      backgroundColor: "#ffffff",
      show: false
    });
    if (process.env.VITE_DEV_SERVER_URL) {
      this.mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      const rendererPath = path.join(__dirname$1, "../renderer/index.html");
      this.mainWindow.loadFile(rendererPath);
    }
    this.initializeWebContentsManager();
    this.mainWindow.once("ready-to-show", () => {
      this.mainWindow.show();
    });
    this.mainWindow.webContents.once("did-finish-load", () => {
    });
    this.mainWindow.on("closed", () => {
      this.webContentsManager.destroy();
      this.chatHistoryStore.destroy();
      this.mainWindow = null;
    });
    this.mainWindow.webContents.on("render-process-gone", (event, details) => {
    });
    this.mainWindow.on("unresponsive", () => {
    });
  }
  initializeWebContentsManager() {
    this.webContentsManager.initialize(this.mainWindow);
  }
  async setupBlogWorkspace() {
    try {
      const tabId = await this.webContentsManager.createTab("https://m8chaa.mycafe24.com/");
      await this.webContentsManager.switchTab(tabId);
      this.currentTabId = tabId;
    } catch (error) {
    }
  }
  hideWebContentsView() {
    if (this.currentTabId && this.webContentsManager) {
      try {
        const currentView = this.webContentsManager.webContentsViews.get(this.currentTabId);
        if (currentView) {
          if (this.mainWindow.contentView && this.mainWindow.contentView.children.includes(currentView)) {
            this.mainWindow.contentView.removeChildView(currentView);
          }
        }
      } catch (error) {
      }
    }
    this.currentTabId = null;
  }
  setupWebContentsEvents() {
    this.webContentsManager.on("navigation", (data) => {
      this.mainWindow.webContents.send("browser-navigated", data);
    });
    this.webContentsManager.on("loading-failed", (data) => {
      this.mainWindow.webContents.send("browser-load-failed", data);
    });
    this.webContentsManager.on("loading-finished", (data) => {
      this.mainWindow.webContents.send("browser-load-finished", data);
    });
    this.webContentsManager.on("loading-started", (data) => {
      this.mainWindow.webContents.send("browser-load-started", data);
    });
    this.webContentsManager.on("loading-stopped", (data) => {
      this.mainWindow.webContents.send("browser-load-stopped", data);
    });
  }
  setupMenu() {
    const template = [
      {
        label: "파일",
        submenu: [
          {
            label: "새 워크플로우",
            accelerator: "CmdOrCtrl+N",
            click: () => {
              this.mainWindow.webContents.send("menu-new-workflow", { type: "menu-new-workflow" });
            }
          },
          { type: "separator" },
          {
            label: "설정",
            accelerator: "CmdOrCtrl+,",
            click: () => {
              this.mainWindow.webContents.send("menu-settings", { type: "menu-settings" });
            }
          },
          { type: "separator" },
          {
            label: "종료",
            accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
            click: () => {
              electron.app.quit();
            }
          }
        ]
      },
      {
        label: "편집",
        submenu: [
          { label: "실행 취소", accelerator: "CmdOrCtrl+Z", role: "undo" },
          { label: "다시 실행", accelerator: "Shift+CmdOrCtrl+Z", role: "redo" },
          { type: "separator" },
          { label: "잘라내기", accelerator: "CmdOrCtrl+X", role: "cut" },
          { label: "복사", accelerator: "CmdOrCtrl+C", role: "copy" },
          { label: "붙여넣기", accelerator: "CmdOrCtrl+V", role: "paste" }
        ]
      },
      {
        label: "보기",
        submenu: [
          { label: "새로고침", accelerator: "CmdOrCtrl+R", role: "reload" },
          { label: "강제 새로고침", accelerator: "CmdOrCtrl+Shift+R", role: "forceReload" },
          { label: "개발자 도구", accelerator: "F12", role: "toggleDevTools" },
          { type: "separator" },
          { label: "실제 크기", accelerator: "CmdOrCtrl+0", role: "resetZoom" },
          { label: "확대", accelerator: "CmdOrCtrl+Plus", role: "zoomIn" },
          { label: "축소", accelerator: "CmdOrCtrl+-", role: "zoomOut" },
          { type: "separator" },
          { label: "전체화면", accelerator: "F11", role: "togglefullscreen" }
        ]
      },
      {
        label: "워크플로우",
        submenu: [
          {
            label: "블로그 자동화",
            accelerator: "CmdOrCtrl+B",
            click: () => {
              this.mainWindow.webContents.send("switch-to-blog-workflow", { type: "switch-to-blog-workflow" });
            }
          },
          {
            label: "메인 워크스페이스",
            accelerator: "CmdOrCtrl+M",
            click: () => {
              this.mainWindow.webContents.send("switch-to-main-workspace", { type: "switch-to-main-workspace" });
            }
          }
        ]
      }
    ];
    const menu = electron.Menu.buildFromTemplate(template);
    electron.Menu.setApplicationMenu(menu);
  }
  setupIPC() {
    electron.ipcMain.handle("store-get", (event, key) => {
      return store.get(key);
    });
    electron.ipcMain.handle("store-set", (event, key, value) => {
      store.set(key, value);
      return true;
    });
    electron.ipcMain.handle("terminal-log", (event, message, level = "log") => {
      const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString();
      const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️" : "📝";
      console[level](`${prefix} [${timestamp}] ${message}`);
    });
    electron.ipcMain.handle("switch-workspace", async (event, workspace) => {
      this.currentWorkspace = workspace;
      if (workspace === "blog") {
        await this.setupBlogWorkspace();
      } else {
        this.hideWebContentsView();
      }
      return { success: true, workspace };
    });
    electron.ipcMain.handle("browser-create-tab", async (event, { url, options }) => {
      try {
        const tabId = await this.webContentsManager.createTab(url, options);
        return { success: true, tabId, url };
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("browser-switch-tab", async (event, { tabId }) => {
      try {
        const result = await this.webContentsManager.switchTab(tabId);
        return result;
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("browser-load-url", async (event, { url, tabId }) => {
      try {
        const result = await this.webContentsManager.loadURL(url, tabId);
        return result;
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("browser-go-back", async (event, { tabId } = {}) => {
      return await this.webContentsManager.goBack(tabId);
    });
    electron.ipcMain.handle("browser-go-forward", async (event, { tabId } = {}) => {
      return await this.webContentsManager.goForward(tabId);
    });
    electron.ipcMain.handle("browser-reload", async (event, { tabId } = {}) => {
      return await this.webContentsManager.reload(tabId);
    });
    electron.ipcMain.handle("browser-can-go-back", (event) => {
      const state = this.webContentsManager.getNavigationState();
      return state.canGoBack;
    });
    electron.ipcMain.handle("browser-can-go-forward", (event) => {
      const state = this.webContentsManager.getNavigationState();
      return state.canGoForward;
    });
    electron.ipcMain.handle("browser-get-url", (event) => {
      const state = this.webContentsManager.getNavigationState();
      return state.url;
    });
    electron.ipcMain.handle("browser-execute-script", async (event, { script, tabId }) => {
      try {
        return await this.webContentsManager.executeScript(script, tabId);
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("browser-get-navigation-state", (event, { tabId } = {}) => {
      return this.webContentsManager.getNavigationState(tabId);
    });
    electron.ipcMain.handle("browser-close-tab", async (event, { tabId }) => {
      try {
        this.webContentsManager.closeTab(tabId);
        return { success: true, tabId };
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("browser-update-bounds", (event, bounds) => {
      try {
        this.webContentsManager.updateWebContentsViewBounds(bounds);
        return { success: true };
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.on("window-minimize", () => {
      this.mainWindow.minimize();
    });
    electron.ipcMain.on("window-maximize", () => {
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow.maximize();
      }
    });
    electron.ipcMain.on("window-close", () => {
      this.mainWindow.close();
    });
    electron.ipcMain.handle("storage-get", async (event, key) => {
      return store.get(key);
    });
    electron.ipcMain.handle("storage-set", async (event, key, value) => {
      store.set(key, value);
      return true;
    });
    electron.ipcMain.handle("storage-delete", async (event, key) => {
      store.delete(key);
      return true;
    });
    electron.ipcMain.handle("storage-has", async (event, key) => {
      return store.has(key);
    });
    electron.ipcMain.handle("ai-provider-store-key", async (event, { providerId, keyData }) => {
      try {
        return await this.secureKeyManager.storeProviderKey(providerId, keyData);
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("ai-provider-get-key", async (event, { providerId }) => {
      try {
        return await this.secureKeyManager.getProviderKey(providerId);
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("ai-provider-remove-key", async (event, { providerId }) => {
      try {
        return await this.secureKeyManager.removeProviderKey(providerId);
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("ai-provider-has-key", (event, { providerId }) => {
      return this.secureKeyManager.hasProviderKey(providerId);
    });
    electron.ipcMain.handle("ai-provider-get-info", (event, { providerId }) => {
      return this.secureKeyManager.getProviderInfo(providerId);
    });
    electron.ipcMain.handle("ai-provider-get-all", (event) => {
      return this.secureKeyManager.getAllProviders();
    });
    electron.ipcMain.handle("ai-provider-test-key", async (event, { providerId }) => {
      try {
        return await this.secureKeyManager.testProviderKey(providerId);
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("ai-provider-update-config", async (event, { providerId, config }) => {
      try {
        return await this.secureKeyManager.updateProviderConfig(providerId, config);
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("ai-provider-get-stats", (event) => {
      return this.secureKeyManager.getProviderStats();
    });
    electron.ipcMain.handle("ai-provider-export-config", async (event) => {
      try {
        return await this.secureKeyManager.exportConfig();
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("ai-provider-import-config", async (event, { importData }) => {
      try {
        return await this.secureKeyManager.importConfig(importData);
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("langchain-send-message", async (event, { message, conversationHistory, systemPrompt }) => {
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          throw new Error("LangChain service not initialized");
        }
        return await this.langChainService.sendMessage(message, conversationHistory, systemPrompt);
      } catch (error) {
        return {
          success: false,
          error: error.message,
          provider: this.langChainService?.currentProvider || "unknown",
          metadata: { timestamp: Date.now() }
        };
      }
    });
    electron.ipcMain.handle("langchain-stream-message", async (event, { message, conversationHistory, systemPrompt }) => {
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          throw new Error("LangChain service not initialized");
        }
        return await this.langChainService.streamMessage(
          message,
          conversationHistory,
          systemPrompt,
          (chunk) => {
            event.sender.send("langchain-stream-chunk", { chunk });
          }
        );
      } catch (error) {
        return {
          success: false,
          error: error.message,
          provider: this.langChainService?.currentProvider || "unknown",
          metadata: { timestamp: Date.now(), streamed: true }
        };
      }
    });
    electron.ipcMain.handle("langchain-switch-provider", async (event, { providerId, modelId }) => {
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          throw new Error("LangChain service not initialized");
        }
        return await this.langChainService.switchProvider(providerId, modelId);
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("langchain-get-providers", (event) => {
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          return [];
        }
        return this.langChainService.getAvailableProviders();
      } catch (error) {
        return [];
      }
    });
    electron.ipcMain.handle("langchain-get-current-status", (event) => {
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          return {
            provider: null,
            model: null,
            status: "disconnected",
            costTracker: { session: { input: 0, output: 0, total: 0 }, total: { input: 0, output: 0, total: 0 } }
          };
        }
        return this.langChainService.getCurrentProviderStatus();
      } catch (error) {
        return {
          provider: null,
          model: null,
          status: "error",
          error: error.message,
          costTracker: { session: { input: 0, output: 0, total: 0 }, total: { input: 0, output: 0, total: 0 } }
        };
      }
    });
    electron.ipcMain.handle("langchain-test-provider", async (event, { providerId }) => {
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          throw new Error("LangChain service not initialized");
        }
        return await this.langChainService.testProvider(providerId);
      } catch (error) {
        return {
          success: false,
          provider: providerId,
          error: error.message
        };
      }
    });
    electron.ipcMain.handle("langchain-get-provider-models", (event, { providerId }) => {
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          return [];
        }
        return this.langChainService.getProviderModels(providerId);
      } catch (error) {
        return [];
      }
    });
    electron.ipcMain.handle("langchain-update-provider-model", async (event, { providerId, modelId }) => {
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          throw new Error("LangChain service not initialized");
        }
        return await this.langChainService.updateProviderModel(providerId, modelId);
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("langchain-reset-session-costs", (event) => {
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          return false;
        }
        this.langChainService.resetSessionCosts();
        return true;
      } catch (error) {
        return false;
      }
    });
    this.setupWebContentsEvents();
    electron.ipcMain.handle("start-blog-automation-from-tool", async (event, data) => {
      console.log("[Main] Received blog automation request from tool:", data);
      this.mainWindow.webContents.send("start-blog-automation-from-tool", data);
      return { success: true };
    });
    electron.ipcMain.handle("wordpress-api-request", async (event, { method, endpoint, data, credentials, isFormData }) => {
      const fetch = (await import("node-fetch")).default;
      const FormData = (await Promise.resolve().then(() => require("./chunks/form_data-TeScCFpF.js")).then((n) => n.form_data)).default;
      try {
        const url = `https://m8chaa.mycafe24.com/wp-json/wp/v2${endpoint}`;
        const base64Auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64");
        const options = {
          method,
          headers: {
            "Authorization": `Basic ${base64Auth}`
          }
        };
        if (data && method !== "GET") {
          if (isFormData) {
            const formData = new FormData();
            if (data.file) {
              const { buffer, filename, type } = data.file;
              formData.append("file", Buffer.from(buffer), {
                filename,
                contentType: type
              });
            }
            options.body = formData;
            Object.assign(options.headers, formData.getHeaders());
          } else {
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(data);
          }
        }
        console.log(`📡 [Main] WordPress API ${method} request to: ${url}`);
        const response = await fetch(url, options);
        const responseData = await response.text();
        let parsedData;
        try {
          parsedData = JSON.parse(responseData);
        } catch {
          parsedData = responseData;
        }
        if (!response.ok) {
          console.error(`❌ [Main] WordPress API error: ${response.status} - ${responseData}`);
          return {
            success: false,
            status: response.status,
            error: parsedData || response.statusText
          };
        }
        console.log(`✅ [Main] WordPress API request successful`);
        return {
          success: true,
          data: parsedData,
          status: response.status
        };
      } catch (error) {
        console.error("❌ [Main] WordPress API request failed:", error);
        return {
          success: false,
          error: error.message
        };
      }
    });
  }
}
new EGDeskTaehwa();
