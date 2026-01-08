import axios from 'axios';

/**
 * 场景类型定义
 */
export type ScenarioType = 'normal' | 'promotion' | 'off_season' | 'anomaly' | 'custom';

/**
 * 场景描述
 */
export const SCENARIOS: Record<ScenarioType, string> = {
  normal: '正常运营',
  promotion: '促销活动',
  off_season: '业务淡季',
  anomaly: '异常事件',
  custom: '自定义场景'
};

/**
 * 指标数据
 */
export interface MetricData {
  name: string;
  value: number;
  previousValue: number;
  change: number;
  changePercent: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

/**
 * 趋势数据点
 */
export interface TrendPoint {
  timestamp: number;
  value: number;
}

/**
 * 地区数据
 */
export interface RegionalData {
  name: string;
  value: number;
  changePercent: number;
}

/**
 * 行业部门数据
 */
export interface IndustryData {
  name: string;
  revenue: number;
  profitMargin: number;
  share: number;
}

/**
 * 竞争对手数据
 */
export interface CompetitorData {
  name: string;
  marketShare: number;
  growthRate: number;
}

/**
 * 风险评估数据
 */
export interface RiskData {
  category: string;
  level: number;
  impact: string;
}

/**
 * 预警数据
 */
export interface AlertData {
  level: 'info' | 'warning' | 'critical';
  message: string;
}

/**
 * AI生成数据响应
 */
export interface AIGeneratedData {
  metrics: MetricData[];
  trend: TrendPoint[];
  regionalData: RegionalData[];
  industryData: IndustryData[];
  competitorData: CompetitorData[];
  riskData: RiskData[];
  insight: string;
  suggestion: string;
  alerts: AlertData[];
}

/**
 * 数据生成请求
 */
export interface DataGenerateRequest {
  scenario: ScenarioType;
  scenarioDescription?: string; // 自定义场景时的描述
  previousData?: {
    totalRevenue?: number;
    profitMargin?: number;
    newCustomers?: number;
  };
}

/**
 * AI数据生成服务
 * 使用魔搭社区AI生成模拟业务数据
 */
export class AIDataGeneratorService {
  private baseURL: string = 'https://api-inference.modelscope.cn/v1';

  /**
   * 生成AI数据
   */
  async generateData(
    request: DataGenerateRequest,
    apiKey: string
  ): Promise<AIGeneratedData> {
    const { scenario, scenarioDescription, previousData } = request;

    // 构建场景描述
    const scenarioDesc = this.getScenarioDescription(scenario, scenarioDescription);

    // 构建Prompt
    const prompt = this.buildPrompt(scenarioDesc, previousData);

    try {
      // 调用魔搭AI
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'deepseek-ai/DeepSeek-V3.2',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的BI数据模拟器。你生成的所有数据都必须是真实的、合理的、符合业务逻辑的。严格按照用户要求的格式返回JSON数据，不要包含任何其他文字说明。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000 // 2分钟超时
        }
      );

      // 解析AI返回的内容
      const content = response.data.choices[0].message.content;
      return this.parseAIResponse(content);
    } catch (error: any) {
      console.error('[AIDataGenerator] AI调用失败:', error);

      // 如果AI调用失败，返回基于规则的降级数据
      return this.getFallbackData(scenario, previousData);
    }
  }

  /**
   * 获取场景描述
   */
  private getScenarioDescription(scenario: ScenarioType, customDesc?: string): string {
    if (scenario === 'custom' && customDesc) {
      return customDesc;
    }

    const descriptions: Record<ScenarioType, string> = {
      normal: '正常运营状态，业务平稳发展，各项指标在小幅范围内正常波动，整体呈现缓慢上升趋势。',
      promotion: '正在开展大型促销活动，市场反响热烈，各项指标出现明显增长，客流量和销售额大幅提升。',
      off_season: '处于业务淡季，市场需求相对疲软，各项指标有所下降，需要在降本增效上下功夫。',
      anomaly: '出现突发异常情况（如系统故障、供应链问题等），导致数据出现异常波动，需要紧急处理。',
      custom: customDesc || '正常运营状态'
    };

    return descriptions[scenario];
  }

  /**
   * 构建AI Prompt
   */
  private buildPrompt(scenarioDesc: string, previousData?: DataGenerateRequest['previousData']): string {
    let prompt = `请根据以下场景生成业务数据：

场景描述：${scenarioDesc}

`;

    if (previousData) {
      prompt += `上期参考数据：
- 总收入：${previousData.totalRevenue || 8500000} 元
- 利润率：${previousData.profitMargin || 28}%
- 新客户数：${previousData.newCustomers || 15000} 人

`;
    }

    prompt += `请生成以下格式的JSON数据（严格遵循格式，不要添加任何其他文字）：
{
  "metrics": [
    {
      "name": "总收入",
      "value": 具体数值(元，整数),
      "previousValue": ${previousData?.totalRevenue || 8500000},
      "change": 变化额(整数),
      "changePercent": 变化百分比(保留2位小数),
      "unit": "元",
      "trend": "up或down或stable"
    },
    {
      "name": "新客户数",
      "value": 具体数值(人，整数),
      "previousValue": ${previousData?.newCustomers || 15000},
      "change": 变化额(整数),
      "changePercent": 变化百分比(保留2位小数),
      "unit": "人",
      "trend": "up或down或stable"
    },
    {
      "name": "客户留存率",
      "value": 具体数值(百分比，保留2位小数),
      "previousValue": 72,
      "change": 变化额(保留2位小数),
      "changePercent": 变化百分比(保留2位小数),
      "unit": "%",
      "trend": "up或down或stable"
    },
    {
      "name": "平均订单价值",
      "value": 具体数值(元，整数),
      "previousValue": 680,
      "change": 变化额(整数),
      "changePercent": 变化百分比(保留2位小数),
      "unit": "元",
      "trend": "up或down或stable"
    },
    {
      "name": "运营成本",
      "value": 具体数值(元，整数),
      "previousValue": 2100000,
      "change": 变化额(整数),
      "changePercent": 变化百分比(保留2位小数),
      "unit": "元",
      "trend": "up或down或stable"
    },
    {
      "name": "利润率",
      "value": 具体数值(百分比，保留2位小数),
      "previousValue": ${previousData?.profitMargin || 28},
      "change": 变化额(保留2位小数),
      "changePercent": 变化百分比(保留2位小数),
      "unit": "%",
      "trend": "up或down或stable"
    },
    {
      "name": "市场份额",
      "value": 具体数值(百分比，保留2位小数),
      "previousValue": 12.5,
      "change": 变化额(保留2位小数),
      "changePercent": 变化百分比(保留2位小数),
      "unit": "%",
      "trend": "up或down或stable"
    },
    {
      "name": "客户满意度",
      "value": 具体数值(分，整数),
      "previousValue": 86,
      "change": 变化额(整数),
      "changePercent": 变化百分比(保留2位小数),
      "unit": "分",
      "trend": "up或down或stable"
    },
    {
      "name": "员工生产力",
      "value": 具体数值(元/人，整数),
      "previousValue": 15000,
      "change": 变化额(整数),
      "changePercent": 变化百分比(保留2位小数),
      "unit": "元/人",
      "trend": "up或down或stable"
    }
  ],
  "trend": [
    {"timestamp": ${Date.now() - 11 * 3600000}, "value": 数值},
    {"timestamp": ${Date.now() - 10 * 3600000}, "value": 数值},
    {"timestamp": ${Date.now() - 9 * 3600000}, "value": 数值},
    {"timestamp": ${Date.now() - 8 * 3600000}, "value": 数值},
    {"timestamp": ${Date.now() - 7 * 3600000}, "value": 数值},
    {"timestamp": ${Date.now() - 6 * 3600000}, "value": 数值},
    {"timestamp": ${Date.now() - 5 * 3600000}, "value": 数值},
    {"timestamp": ${Date.now() - 4 * 3600000}, "value": 数值},
    {"timestamp": ${Date.now() - 3 * 3600000}, "value": 数值},
    {"timestamp": ${Date.now() - 2 * 3600000}, "value": 数值},
    {"timestamp": ${Date.now() - 1 * 3600000}, "value": 数值},
    {"timestamp": ${Date.now()}, "value": 数值}
  ],
  "regionalData": [
    {"name": "北区", "value": 营收数值(整数), "changePercent": 增长率(保留2位小数)},
    {"name": "中区", "value": 营收数值(整数), "changePercent": 增长率(保留2位小数)},
    {"name": "南区", "value": 营收数值(整数), "changePercent": 增长率(保留2位小数)},
    {"name": "西区", "value": 营收数值(整数), "changePercent": 增长率(保留2位小数)}
  ],
  "industryData": [
    {"name": "科技产品", "revenue": 营收数值(整数), "profitMargin": 利润率(保留2位小数), "share": 份额(保留2位小数)},
    {"name": "健康医疗", "revenue": 营收数值(整数), "profitMargin": 利润率(保留2位小数), "share": 份额(保留2位小数)},
    {"name": "教育培训", "revenue": 营收数值(整数), "profitMargin": 利润率(保留2位小数), "share": 份额(保留2位小数)},
    {"name": "零售服务", "revenue": 营收数值(整数), "profitMargin": 利润率(保留2位小数), "share": 份额(保留2位小数)},
    {"name": "其他业务", "revenue": 营收数值(整数), "profitMargin": 利润率(保留2位小数), "share": 份额(保留2位小数)}
  ],
  "competitorData": [
    {"name": "竞争对手A", "marketShare": 市场份额(保留2位小数), "growthRate": 增长率(保留2位小数)},
    {"name": "竞争对手B", "marketShare": 市场份额(保留2位小数), "growthRate": 增长率(保留2位小数)},
    {"name": "竞争对手C", "marketShare": 市场份额(保留2位小数), "growthRate": 增长率(保留2位小数)},
    {"name": "其他竞争对手", "marketShare": 市场份额(保留2位小数), "growthRate": 增长率(保留2位小数)}
  ],
  "riskData": [
    {"category": "市场风险", "level": 风险等级(1-5), "impact": "影响程度"},
    {"category": "运营风险", "level": 风险等级(1-5), "impact": "影响程度"},
    {"category": "财务风险", "level": 风险等级(1-5), "impact": "影响程度"},
    {"category": "技术风险", "level": 风险等级(1-5), "impact": "影响程度"},
    {"category": "法律风险", "level": 风险等级(1-5), "impact": "影响程度"}
  ],
  "insight": "数据洞察：用2-3句话分析当前数据变化特征、主要原因和业务影响。",
  "suggestion": "建议：针对当前数据情况提出1-2条具体的、可操作的业务建议。",
  "alerts": [
    {"level": "info或warning或critical", "message": "预警信息描述"}
  ]
}

注意：
1. 只返回JSON数据，不要添加任何其他文字说明
2. 所有数值必须真实合理，符合业务逻辑
3. trend数组中的数值要体现时间变化的趋势
4. changePercent计算公式：(value - previousValue) / previousValue * 100，保留2位小数
5. 根据场景特点生成数据，如促销场景各项指标应该有明显上升
6. regionalData按营收从高到低排序，industryData按营收从高到低排序
7. alerts数组根据指标异常情况生成预警，如利润率低于25%生成warning预警`;

    return prompt;
  }

  /**
   * 解析AI响应
   */
  private parseAIResponse(content: string): AIGeneratedData {
    try {
      // 尝试直接解析JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);

        // 确保数据格式正确
        if (data.metrics && data.trend && data.insight && data.suggestion) {
          return {
            metrics: data.metrics,
            trend: data.trend,
            regionalData: data.regionalData || [],
            industryData: data.industryData || [],
            competitorData: data.competitorData || [],
            riskData: data.riskData || [],
            insight: data.insight,
            suggestion: data.suggestion,
            alerts: data.alerts || []
          };
        }
      }

      throw new Error('AI返回格式不正确');
    } catch (error) {
      console.error('[AIDataGenerator] 解析AI响应失败:', error);
      throw error;
    }
  }

  /**
   * 降级数据生成（AI调用失败时使用）
   */
  private getFallbackData(
    scenario: ScenarioType,
    previousData?: DataGenerateRequest['previousData']
  ): AIGeneratedData {
    const prevRevenue = previousData?.totalRevenue || 8500000;
    const prevProfitMargin = previousData?.profitMargin || 28;
    const prevNewCustomers = previousData?.newCustomers || 15000;

    let revenueMultiplier = 1;
    let profitMarginMultiplier = 1;
    let newCustomersMultiplier = 1;

    // 根据场景调整数据
    switch (scenario) {
      case 'promotion':
        revenueMultiplier = 1.2 + Math.random() * 0.3; // 20-50%增长
        profitMarginMultiplier = 0.9 + Math.random() * 0.1; // 利润率可能略降
        newCustomersMultiplier = 1.3 + Math.random() * 0.4; // 30-70%增长
        break;
      case 'off_season':
        revenueMultiplier = 0.7 + Math.random() * 0.15; // 15-30%下降
        profitMarginMultiplier = 0.95 + Math.random() * 0.05; // 利润率略降
        newCustomersMultiplier = 0.75 + Math.random() * 0.15; // 15-25%下降
        break;
      case 'anomaly':
        revenueMultiplier = 0.5 + Math.random() * 0.3; // 大幅波动
        profitMarginMultiplier = 0.8 + Math.random() * 0.3;
        newCustomersMultiplier = 0.6 + Math.random() * 0.4;
        break;
      default: // normal
        revenueMultiplier = 1.02 + Math.random() * 0.08; // 2-10%增长
        profitMarginMultiplier = 0.98 + Math.random() * 0.06;
        newCustomersMultiplier = 1.03 + Math.random() * 0.1;
    }

    const totalRevenue = Math.round(prevRevenue * revenueMultiplier);
    const profitMargin = Number((prevProfitMargin * profitMarginMultiplier).toFixed(2));
    const newCustomers = Math.round(prevNewCustomers * newCustomersMultiplier);

    const revenueChange = totalRevenue - prevRevenue;
    const revenueChangePercent = Number(((revenueChange / prevRevenue) * 100).toFixed(2));
    const profitMarginChange = Number((profitMargin - prevProfitMargin).toFixed(2));
    const profitMarginChangePercent = Number(((profitMarginChange / prevProfitMargin) * 100).toFixed(2));
    const newCustomersChange = newCustomers - prevNewCustomers;
    const newCustomersChangePercent = Number(((newCustomersChange / prevNewCustomers) * 100).toFixed(2));

    // 生成趋势数据
    const trend: TrendPoint[] = [];
    for (let i = 11; i >= 0; i--) {
      const timestamp = Date.now() - i * 3600000;
      const randomFactor = 0.9 + Math.random() * 0.2;
      trend.push({
        timestamp,
        value: Math.round(totalRevenue * randomFactor * (1 - i * 0.02))
      });
    }

    // 生成更多指标数据
    const customerRetention = Number((72 * (0.95 + Math.random() * 0.1)).toFixed(2));
    const customerRetentionChange = Number((customerRetention - 72).toFixed(2));
    const customerRetentionChangePercent = Number(((customerRetentionChange / 72) * 100).toFixed(2));

    const averageOrderValue = Math.round(680 * (0.95 + Math.random() * 0.1));
    const averageOrderValueChange = averageOrderValue - 680;
    const averageOrderValueChangePercent = Number(((averageOrderValueChange / 680) * 100).toFixed(2));

    const operationalCost = Math.round(2100000 * revenueMultiplier * (0.95 + Math.random() * 0.1));
    const operationalCostChange = operationalCost - 2100000;
    const operationalCostChangePercent = Number(((operationalCostChange / 2100000) * 100).toFixed(2));

    const marketShare = Number((12.5 * (0.98 + Math.random() * 0.04)).toFixed(2));
    const marketShareChange = Number((marketShare - 12.5).toFixed(2));
    const marketShareChangePercent = Number(((marketShareChange / 12.5) * 100).toFixed(2));

    const customerSatisfaction = Math.round(86 * (0.95 + Math.random() * 0.1));
    const customerSatisfactionChange = customerSatisfaction - 86;
    const customerSatisfactionChangePercent = Number(((customerSatisfactionChange / 86) * 100).toFixed(2));

    const employeeProductivity = Math.round(15000 * (0.95 + Math.random() * 0.1));
    const employeeProductivityChange = employeeProductivity - 15000;
    const employeeProductivityChangePercent = Number(((employeeProductivityChange / 15000) * 100).toFixed(2));

    // 生成地区数据
    const regionalData = [
      { name: '中区', value: Math.round(totalRevenue * 0.32), changePercent: Number((9 * revenueMultiplier + (Math.random() - 0.5) * 5).toFixed(2)) },
      { name: '北区', value: Math.round(totalRevenue * 0.28), changePercent: Number((6 * revenueMultiplier + (Math.random() - 0.5) * 5).toFixed(2)) },
      { name: '南区', value: Math.round(totalRevenue * 0.25), changePercent: Number((14 * revenueMultiplier + (Math.random() - 0.5) * 5).toFixed(2)) },
      { name: '西区', value: Math.round(totalRevenue * 0.15), changePercent: Number((18 * revenueMultiplier + (Math.random() - 0.5) * 5).toFixed(2)) }
    ].sort((a, b) => b.value - a.value);

    // 生成行业数据
    const industryData = [
      { name: '科技产品', revenue: Math.round(totalRevenue * 0.38), profitMargin: Number((32 + (Math.random() - 0.5) * 5).toFixed(2)), share: 38 },
      { name: '健康医疗', revenue: Math.round(totalRevenue * 0.25), profitMargin: Number((35 + (Math.random() - 0.5) * 5).toFixed(2)), share: 25 },
      { name: '教育培训', revenue: Math.round(totalRevenue * 0.18), profitMargin: Number((28 + (Math.random() - 0.5) * 5).toFixed(2)), share: 18 },
      { name: '零售服务', revenue: Math.round(totalRevenue * 0.12), profitMargin: Number((22 + (Math.random() - 0.5) * 5).toFixed(2)), share: 12 },
      { name: '其他业务', revenue: Math.round(totalRevenue * 0.07), profitMargin: Number((20 + (Math.random() - 0.5) * 5).toFixed(2)), share: 7 }
    ].sort((a, b) => b.revenue - a.revenue);

    // 生成竞争对手数据
    const competitorData = [
      { name: '竞争对手A', marketShare: 18.5, growthRate: Number((0.08 + (Math.random() - 0.5) * 0.04).toFixed(2)) },
      { name: '竞争对手B', marketShare: 15.2, growthRate: Number((0.12 + (Math.random() - 0.5) * 0.04).toFixed(2)) },
      { name: '竞争对手C', marketShare: 10.8, growthRate: Number((0.05 + (Math.random() - 0.5) * 0.04).toFixed(2)) },
      { name: '其他竞争对手', marketShare: 43.0, growthRate: Number((0.03 + (Math.random() - 0.5) * 0.02).toFixed(2)) }
    ];

    // 生成风险评估数据
    const riskData = [
      { category: '市场风险', level: 3, impact: '中等' },
      { category: '运营风险', level: 2, impact: '低' },
      { category: '财务风险', level: 4, impact: '高' },
      { category: '技术风险', level: 2, impact: '低' },
      { category: '法律风险', level: 3, impact: '中等' }
    ];

    // 生成预警
    const alerts: AlertData[] = [];
    if (profitMargin < 25) {
      alerts.push({ level: 'warning', message: `利润率低于25%，需要关注成本控制` });
    }
    if (profitMargin < 20) {
      alerts.push({ level: 'critical', message: `利润率严重偏低，请立即采取行动！` });
    }
    if (newCustomersChangePercent < -20) {
      alerts.push({ level: 'warning', message: `新客户数大幅下降${Math.abs(newCustomersChangePercent).toFixed(2)}%` });
    }
    if (customerRetention < 70) {
      alerts.push({ level: 'info', message: `客户留存率偏低，建议优化客户维护策略` });
    }
    if (scenario === 'anomaly') {
      alerts.push({ level: 'critical', message: '检测到异常事件，请立即处理！' });
    }

    return {
      metrics: [
        {
          name: '总收入',
          value: totalRevenue,
          previousValue: prevRevenue,
          change: revenueChange,
          changePercent: revenueChangePercent,
          unit: '元',
          trend: revenueChangePercent > 0 ? 'up' : revenueChangePercent < 0 ? 'down' : 'stable'
        },
        {
          name: '新客户数',
          value: newCustomers,
          previousValue: prevNewCustomers,
          change: newCustomersChange,
          changePercent: newCustomersChangePercent,
          unit: '人',
          trend: newCustomersChangePercent > 0 ? 'up' : newCustomersChangePercent < 0 ? 'down' : 'stable'
        },
        {
          name: '客户留存率',
          value: customerRetention,
          previousValue: 72,
          change: customerRetentionChange,
          changePercent: customerRetentionChangePercent,
          unit: '%',
          trend: customerRetentionChangePercent > 0 ? 'up' : customerRetentionChangePercent < 0 ? 'down' : 'stable'
        },
        {
          name: '平均订单价值',
          value: averageOrderValue,
          previousValue: 680,
          change: averageOrderValueChange,
          changePercent: averageOrderValueChangePercent,
          unit: '元',
          trend: averageOrderValueChangePercent > 0 ? 'up' : averageOrderValueChangePercent < 0 ? 'down' : 'stable'
        },
        {
          name: '运营成本',
          value: operationalCost,
          previousValue: 2100000,
          change: operationalCostChange,
          changePercent: operationalCostChangePercent,
          unit: '元',
          trend: operationalCostChangePercent > 0 ? 'up' : operationalCostChangePercent < 0 ? 'down' : 'stable'
        },
        {
          name: '利润率',
          value: profitMargin,
          previousValue: prevProfitMargin,
          change: profitMarginChange,
          changePercent: profitMarginChangePercent,
          unit: '%',
          trend: profitMarginChangePercent > 0 ? 'up' : profitMarginChangePercent < 0 ? 'down' : 'stable'
        },
        {
          name: '市场份额',
          value: marketShare,
          previousValue: 12.5,
          change: marketShareChange,
          changePercent: marketShareChangePercent,
          unit: '%',
          trend: marketShareChangePercent > 0 ? 'up' : marketShareChangePercent < 0 ? 'down' : 'stable'
        },
        {
          name: '客户满意度',
          value: customerSatisfaction,
          previousValue: 86,
          change: customerSatisfactionChange,
          changePercent: customerSatisfactionChangePercent,
          unit: '分',
          trend: customerSatisfactionChangePercent > 0 ? 'up' : customerSatisfactionChangePercent < 0 ? 'down' : 'stable'
        },
        {
          name: '员工生产力',
          value: employeeProductivity,
          previousValue: 15000,
          change: employeeProductivityChange,
          changePercent: employeeProductivityChangePercent,
          unit: '元/人',
          trend: employeeProductivityChangePercent > 0 ? 'up' : employeeProductivityChangePercent < 0 ? 'down' : 'stable'
        }
      ],
      trend,
      regionalData,
      industryData,
      competitorData,
      riskData,
      insight: this.getFallbackInsight(scenario, revenueChangePercent, newCustomersChangePercent),
      suggestion: this.getFallbackSuggestion(scenario),
      alerts
    };
  }

  /**
   * 获取降级数据洞察
   */
  private getFallbackInsight(scenario: ScenarioType, revenueChangePercent: number, newCustomersChangePercent: number): string {
    switch (scenario) {
      case 'promotion':
        return `本期受促销活动影响，总收入增长${revenueChangePercent.toFixed(2)}%，新客户数增长${newCustomersChangePercent.toFixed(2)}%。促销活动效果显著，带动各项指标明显提升。`;
      case 'off_season':
        return `本期处于业务淡季，总收入${revenueChangePercent > 0 ? '仅增长' + revenueChangePercent.toFixed(2) : '下降' + Math.abs(revenueChangePercent).toFixed(2)}%，新客户数${newCustomersChangePercent > 0 ? '增长' + newCustomersChangePercent.toFixed(2) : '下降' + Math.abs(newCustomersChangePercent).toFixed(2)}%。淡季效应明显，需加强成本控制。`;
      case 'anomaly':
        return `本期数据出现异常波动，可能受外部因素影响。建议深入分析异常原因，及时采取应对措施，降低对业务的影响。`;
      default:
        return `本期业务运行平稳，总收入增长${revenueChangePercent.toFixed(2)}%，新客户数增长${newCustomersChangePercent.toFixed(2)}%。整体趋势向好，继续保持当前运营策略。`;
    }
  }

  /**
   * 获取降级建议
   */
  private getFallbackSuggestion(scenario: ScenarioType): string {
    switch (scenario) {
      case 'promotion':
        return '建议：1. 继续加大促销推广力度，扩大市场覆盖；2. 关注客户留存率，提升转化效果。';
      case 'off_season':
        return '建议：1. 优化成本结构，提升运营效率；2. 加强老客户维护，挖掘存量价值；3. 提前规划旺季储备。';
      case 'anomaly':
        return '建议：1. 立即排查异常原因，制定应对方案；2. 加强风险监控，建立预警机制；3. 及时与相关部门沟通协调。';
      default:
        return '建议：1. 持续关注核心指标变化趋势；2. 优化产品和服务质量；3. 保持良好的客户关系。';
    }
  }
}

export default new AIDataGeneratorService();
