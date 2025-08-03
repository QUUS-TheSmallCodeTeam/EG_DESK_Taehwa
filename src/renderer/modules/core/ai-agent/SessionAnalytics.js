/**
 * SessionAnalytics - Advanced Chat Session Analytics and Insights
 * 
 * Provides detailed analytics, usage patterns, and insights for AI chat sessions.
 * Tracks user behavior, conversation quality, token usage, and performance metrics.
 */

import { EventEmitter } from '../../../utils/EventEmitter.js';

class SessionAnalytics extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      enableTracking: options.enableTracking !== false,
      trackUserBehavior: options.trackUserBehavior !== false,
      trackPerformance: options.trackPerformance !== false,
      retentionPeriod: options.retentionPeriod || (90 * 24 * 60 * 60 * 1000), // 90 days
      aggregationInterval: options.aggregationInterval || (60 * 60 * 1000), // 1 hour
      ...options
    };
    
    this.isInitialized = false;
    
    // Analytics data
    this.sessionMetrics = new Map();
    this.userBehavior = new Map();
    this.performanceMetrics = new Map();
    this.conversationQuality = new Map();
    
    // Aggregated data
    this.dailyStats = new Map();
    this.weeklyStats = new Map();
    this.monthlyStats = new Map();
    
    // Real-time tracking
    this.currentSession = null;
    this.sessionStartTime = null;
    this.lastActivityTime = null;
    
    // Aggregation timer
    this.aggregationTimer = null;
  }

  /**
   * Initialize session analytics
   */
  async initialize(conversationManager, globalStateManager) {
    try {
      
      this.conversationManager = conversationManager;
      this.globalStateManager = globalStateManager;
      
      // Load existing analytics data
      await this.loadAnalyticsData();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Start aggregation timer
      this.startAggregationTimer();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      return true;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    if (this.conversationManager) {
      this.conversationManager.on('conversation-created', (data) => {
        this.trackSessionStart(data);
      });
      
      this.conversationManager.on('message-added', (data) => {
        this.trackMessage(data);
      });
      
      this.conversationManager.on('conversation-switched', (data) => {
        this.trackSessionSwitch(data);
      });
      
      this.conversationManager.on('conversation-cleared', (data) => {
        this.trackSessionClear(data);
      });
      
      this.conversationManager.on('conversation-compacted', (data) => {
        this.trackSessionCompact(data);
      });
    }
  }

  /**
   * Track session start
   */
  trackSessionStart(data) {
    if (!this.options.enableTracking) return;
    
    const sessionId = data.conversationId;
    const now = Date.now();
    
    this.currentSession = sessionId;
    this.sessionStartTime = now;
    this.lastActivityTime = now;
    
    const metrics = {
      sessionId: sessionId,
      startTime: now,
      endTime: null,
      duration: null,
      messageCount: 0,
      userMessages: 0,
      assistantMessages: 0,
      tokenUsage: { input: 0, output: 0, total: 0 },
      commands: [],
      errors: [],
      quality: {
        responsiveness: 0,
        engagement: 0,
        satisfaction: 0
      },
      behavior: {
        averageMessageLength: 0,
        timeBetweenMessages: [],
        commandUsage: new Map(),
        sessionSwitches: 0
      }
    };
    
    this.sessionMetrics.set(sessionId, metrics);
    
    this.emit('session-start-tracked', { sessionId, metrics });
  }

  /**
   * Track message activity
   */
  trackMessage(data) {
    if (!this.options.enableTracking) return;
    
    const { conversationId, message } = data;
    const metrics = this.sessionMetrics.get(conversationId);
    
    if (!metrics) return;
    
    const now = Date.now();
    
    // Update basic metrics
    metrics.messageCount++;
    if (message.role === 'user') {
      metrics.userMessages++;
      
      // Track user behavior
      if (this.options.trackUserBehavior) {
        this.trackUserMessage(conversationId, message, now);
      }
    } else {
      metrics.assistantMessages++;
      
      // Track assistant performance
      if (this.options.trackPerformance) {
        this.trackAssistantMessage(conversationId, message, now);
      }
    }
    
    // Update token usage
    if (message.metadata?.tokens) {
      metrics.tokenUsage.input += message.metadata.tokens.input || 0;
      metrics.tokenUsage.output += message.metadata.tokens.output || 0;
      metrics.tokenUsage.total = metrics.tokenUsage.input + metrics.tokenUsage.output;
    }
    
    // Track commands
    if (message.metadata?.command) {
      metrics.commands.push({
        command: message.metadata.command,
        timestamp: now,
        success: !message.metadata.error
      });
    }
    
    // Update activity time
    this.lastActivityTime = now;
    
    this.emit('message-tracked', { conversationId, message, metrics });
  }

  /**
   * Track user message behavior
   */
  trackUserMessage(sessionId, message, timestamp) {
    const metrics = this.sessionMetrics.get(sessionId);
    if (!metrics) return;
    
    const behavior = metrics.behavior;
    
    // Calculate time between messages
    if (this.lastActivityTime) {
      const timeBetween = timestamp - this.lastActivityTime;
      behavior.timeBetweenMessages.push(timeBetween);
    }
    
    // Track message length
    const messageLength = message.content.length;
    behavior.averageMessageLength = (
      (behavior.averageMessageLength * (metrics.userMessages - 1)) + messageLength
    ) / metrics.userMessages;
    
    // Track command usage
    if (message.content.startsWith('/')) {
      const command = message.content.split(' ')[0];
      const count = behavior.commandUsage.get(command) || 0;
      behavior.commandUsage.set(command, count + 1);
    }
  }

  /**
   * Track assistant message performance
   */
  trackAssistantMessage(sessionId, message, timestamp) {
    const metrics = this.sessionMetrics.get(sessionId);
    if (!metrics) return;
    
    // Calculate response time (if available)
    if (message.metadata?.responseTime) {
      const responseTimes = metrics.quality.responseTimes || [];
      responseTimes.push(message.metadata.responseTime);
      metrics.quality.responseTimes = responseTimes;
      
      // Update average responsiveness score
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      metrics.quality.responsiveness = this.calculateResponsivenessScore(avgResponseTime);
    }
    
    // Track message quality indicators
    if (message.metadata?.quality) {
      metrics.quality.engagement = message.metadata.quality.engagement || metrics.quality.engagement;
      metrics.quality.satisfaction = message.metadata.quality.satisfaction || metrics.quality.satisfaction;
    }
  }

  /**
   * Track session switch
   */
  trackSessionSwitch(data) {
    if (!this.options.enableTracking) return;
    
    const { conversationId, previousId } = data;
    
    // End previous session tracking
    if (previousId && this.sessionMetrics.has(previousId)) {
      this.trackSessionEnd(previousId);
    }
    
    // Update current session
    this.currentSession = conversationId;
    
    // Track switch behavior
    if (this.sessionMetrics.has(conversationId)) {
      this.sessionMetrics.get(conversationId).behavior.sessionSwitches++;
    }
    
  }

  /**
   * Track session end
   */
  trackSessionEnd(sessionId) {
    const metrics = this.sessionMetrics.get(sessionId);
    if (!metrics || metrics.endTime) return;
    
    const now = Date.now();
    metrics.endTime = now;
    metrics.duration = now - metrics.startTime;
    
    // Calculate final quality scores
    this.calculateSessionQuality(sessionId);
    
    // Store completed session
    this.storeCompletedSession(sessionId, metrics);
    
    this.emit('session-end-tracked', { sessionId, metrics });
  }

  /**
   * Calculate session quality metrics
   */
  calculateSessionQuality(sessionId) {
    const metrics = this.sessionMetrics.get(sessionId);
    if (!metrics) return;
    
    const quality = metrics.quality;
    
    // Engagement score based on message exchange
    if (metrics.messageCount > 0) {
      const exchangeRatio = metrics.assistantMessages / Math.max(metrics.userMessages, 1);
      quality.engagement = Math.min(exchangeRatio * 50, 100);
    }
    
    // Session completion score
    const idealDuration = 10 * 60 * 1000; // 10 minutes
    const actualDuration = metrics.duration || 0;
    quality.completion = Math.min((actualDuration / idealDuration) * 100, 100);
    
    // Overall satisfaction (weighted average)
    quality.overall = (
      quality.responsiveness * 0.3 +
      quality.engagement * 0.4 +
      quality.completion * 0.3
    );
    
    this.conversationQuality.set(sessionId, quality);
  }

  /**
   * Get analytics dashboard data
   */
  getDashboardData(timeRange = '7d') {
    const endTime = Date.now();
    const startTime = this.getTimeRangeStart(timeRange, endTime);
    
    return {
      overview: this.getOverviewStats(startTime, endTime),
      usage: this.getUsageStats(startTime, endTime),
      performance: this.getPerformanceStats(startTime, endTime),
      quality: this.getQualityStats(startTime, endTime),
      trends: this.getTrendData(startTime, endTime),
      insights: this.generateInsights(startTime, endTime)
    };
  }

  /**
   * Get overview statistics
   */
  getOverviewStats(startTime, endTime) {
    const sessions = this.getSessionsInRange(startTime, endTime);
    
    const totalSessions = sessions.length;
    const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);
    const totalTokens = sessions.reduce((sum, s) => sum + s.tokenUsage.total, 0);
    const averageDuration = sessions.length > 0 ? 
      sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length : 0;
    
    return {
      totalSessions,
      totalMessages,
      totalTokens,
      averageDuration,
      averageMessagesPerSession: totalSessions > 0 ? totalMessages / totalSessions : 0
    };
  }

  /**
   * Get usage statistics
   */
  getUsageStats(startTime, endTime) {
    const sessions = this.getSessionsInRange(startTime, endTime);
    
    const commandUsage = new Map();
    const hourlyActivity = new Array(24).fill(0);
    const dailyActivity = new Array(7).fill(0);
    
    sessions.forEach(session => {
      // Aggregate command usage
      session.behavior.commandUsage.forEach((count, command) => {
        commandUsage.set(command, (commandUsage.get(command) || 0) + count);
      });
      
      // Track activity by hour and day
      const date = new Date(session.startTime);
      hourlyActivity[date.getHours()]++;
      dailyActivity[date.getDay()]++;
    });
    
    return {
      commandUsage: Object.fromEntries(commandUsage),
      hourlyActivity,
      dailyActivity,
      peakHours: this.findPeakHours(hourlyActivity),
      peakDays: this.findPeakDays(dailyActivity)
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(startTime, endTime) {
    const sessions = this.getSessionsInRange(startTime, endTime);
    
    const responseTimes = [];
    const errorCounts = { total: 0, byType: new Map() };
    
    sessions.forEach(session => {
      if (session.quality.responseTimes) {
        responseTimes.push(...session.quality.responseTimes);
      }
      
      session.errors.forEach(error => {
        errorCounts.total++;
        const type = error.type || 'unknown';
        errorCounts.byType.set(type, (errorCounts.byType.get(type) || 0) + 1);
      });
    });
    
    return {
      averageResponseTime: responseTimes.length > 0 ? 
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      responseTimePercentiles: this.calculatePercentiles(responseTimes),
      errorRate: sessions.length > 0 ? errorCounts.total / sessions.length : 0,
      errorsByType: Object.fromEntries(errorCounts.byType)
    };
  }

  /**
   * Get quality statistics
   */
  getQualityStats(startTime, endTime) {
    const sessions = this.getSessionsInRange(startTime, endTime);
    
    const qualityScores = {
      responsiveness: [],
      engagement: [],
      satisfaction: [],
      overall: []
    };
    
    sessions.forEach(session => {
      const quality = session.quality;
      qualityScores.responsiveness.push(quality.responsiveness || 0);
      qualityScores.engagement.push(quality.engagement || 0);
      qualityScores.satisfaction.push(quality.satisfaction || 0);
      qualityScores.overall.push(quality.overall || 0);
    });
    
    return {
      averageScores: {
        responsiveness: this.average(qualityScores.responsiveness),
        engagement: this.average(qualityScores.engagement),
        satisfaction: this.average(qualityScores.satisfaction),
        overall: this.average(qualityScores.overall)
      },
      scoreDistribution: {
        excellent: qualityScores.overall.filter(s => s >= 80).length,
        good: qualityScores.overall.filter(s => s >= 60 && s < 80).length,
        fair: qualityScores.overall.filter(s => s >= 40 && s < 60).length,
        poor: qualityScores.overall.filter(s => s < 40).length
      }
    };
  }

  /**
   * Generate insights and recommendations
   */
  generateInsights(startTime, endTime) {
    const sessions = this.getSessionsInRange(startTime, endTime);
    const insights = [];
    
    // Usage patterns
    const avgDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length;
    if (avgDuration < 5 * 60 * 1000) { // Less than 5 minutes
      insights.push({
        type: 'usage',
        level: 'info',
        message: 'Sessions are typically short. Consider improving engagement.',
        recommendation: 'Add more interactive features or follow-up questions.'
      });
    }
    
    // Performance issues
    const avgResponseTime = this.getPerformanceStats(startTime, endTime).averageResponseTime;
    if (avgResponseTime > 5000) { // More than 5 seconds
      insights.push({
        type: 'performance',
        level: 'warning',
        message: 'Response times are slower than optimal.',
        recommendation: 'Optimize Claude integration or check system resources.'
      });
    }
    
    // Quality improvements
    const qualityStats = this.getQualityStats(startTime, endTime);
    if (qualityStats.averageScores.overall < 70) {
      insights.push({
        type: 'quality',
        level: 'warning',
        message: 'Overall session quality could be improved.',
        recommendation: 'Review conversation patterns and enhance AI responses.'
      });
    }
    
    return insights;
  }

  /**
   * Helper Methods
   */
  
  getTimeRangeStart(timeRange, endTime) {
    const ranges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    };
    
    return endTime - (ranges[timeRange] || ranges['7d']);
  }
  
  getSessionsInRange(startTime, endTime) {
    return Array.from(this.sessionMetrics.values())
      .filter(session => {
        return session.startTime >= startTime && session.startTime <= endTime;
      });
  }
  
  calculateResponsivenessScore(responseTime) {
    // Score from 0-100 based on response time
    const maxTime = 10000; // 10 seconds
    return Math.max(0, 100 - (responseTime / maxTime) * 100);
  }
  
  calculatePercentiles(values) {
    if (values.length === 0) return { p50: 0, p95: 0, p99: 0 };
    
    const sorted = [...values].sort((a, b) => a - b);
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }
  
  average(values) {
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }
  
  findPeakHours(hourlyActivity) {
    const maxActivity = Math.max(...hourlyActivity);
    return hourlyActivity
      .map((activity, hour) => ({ hour, activity }))
      .filter(item => item.activity === maxActivity)
      .map(item => item.hour);
  }
  
  findPeakDays(dailyActivity) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const maxActivity = Math.max(...dailyActivity);
    return dailyActivity
      .map((activity, day) => ({ day: days[day], activity }))
      .filter(item => item.activity === maxActivity)
      .map(item => item.day);
  }
  
  storeCompletedSession(sessionId, metrics) {
    // Store in daily aggregation
    const date = new Date(metrics.startTime).toDateString();
    if (!this.dailyStats.has(date)) {
      this.dailyStats.set(date, {
        sessions: 0,
        messages: 0,
        duration: 0,
        tokens: 0
      });
    }
    
    const dayStats = this.dailyStats.get(date);
    dayStats.sessions++;
    dayStats.messages += metrics.messageCount;
    dayStats.duration += metrics.duration || 0;
    dayStats.tokens += metrics.tokenUsage.total;
  }
  
  startAggregationTimer() {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }
    
    this.aggregationTimer = setInterval(() => {
      this.performAggregation();
    }, this.options.aggregationInterval);
  }
  
  performAggregation() {
    // Aggregate hourly data into daily
    // Aggregate daily data into weekly/monthly
    // Clean up old detailed data beyond retention period
    
    const cutoffTime = Date.now() - this.options.retentionPeriod;
    
    // Remove old session metrics
    for (const [sessionId, metrics] of this.sessionMetrics) {
      if (metrics.startTime < cutoffTime) {
        this.sessionMetrics.delete(sessionId);
      }
    }
    
  }
  
  async loadAnalyticsData() {
    if (!this.globalStateManager) return;
    
    try {
      const analyticsData = this.globalStateManager.getState('sessionAnalytics');
      if (analyticsData) {
        // Restore analytics data
        this.dailyStats = new Map(Object.entries(analyticsData.dailyStats || {}));
        this.weeklyStats = new Map(Object.entries(analyticsData.weeklyStats || {}));
        this.monthlyStats = new Map(Object.entries(analyticsData.monthlyStats || {}));
      }
    } catch (error) {
    }
  }
  
  async saveAnalyticsData() {
    if (!this.globalStateManager) return;
    
    try {
      this.globalStateManager.setState('sessionAnalytics', {
        dailyStats: Object.fromEntries(this.dailyStats),
        weeklyStats: Object.fromEntries(this.weeklyStats),
        monthlyStats: Object.fromEntries(this.monthlyStats),
        lastSaved: Date.now()
      });
    } catch (error) {
    }
  }

  /**
   * Destroy session analytics
   */
  async destroy() {
    // End current session tracking
    if (this.currentSession) {
      this.trackSessionEnd(this.currentSession);
    }
    
    // Clear aggregation timer
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = null;
    }
    
    // Save final data
    await this.saveAnalyticsData();
    
    // Clear data structures
    this.sessionMetrics.clear();
    this.userBehavior.clear();
    this.performanceMetrics.clear();
    this.conversationQuality.clear();
    this.dailyStats.clear();
    this.weeklyStats.clear();
    this.monthlyStats.clear();
    
    // Remove event listeners
    this.removeAllListeners();
    
    this.isInitialized = false;
  }
}

export default SessionAnalytics;