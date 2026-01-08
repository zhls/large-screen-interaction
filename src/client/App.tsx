import React, { useEffect, useState, useRef } from 'react';
import { ApiKeyConfig } from './components/Config/ApiKeyConfig';
import { DashboardLayout } from './components/Dashboard/DashboardLayout';
import { AvatarContainer } from './components/Avatar/AvatarContainer';
import { MetricCard } from './components/Dashboard/MetricCard';
import { TrendChart, BarChart, PieChart, GaugeChart, RadarChart } from './components/Chart';
import { ScenarioSwitcher } from './components/Data/ScenarioSwitcher';
import { ChatBox } from './components/Chat/ChatBox';
import { TaskPanel } from './components/Dashboard/TaskPanel';
import { AlertSystem } from './components/Dashboard/AlertSystem';
import keyService from './services/keyService';
import dataService from './services/dataService';
import { useKeyStore } from './store/keyStore';
import { useAvatarStore } from './store/avatarStore';
import AvatarController from './components/Avatar/AvatarController';
import type { AIGeneratedData } from './services/dataService';

type ViewMode = 'overview' | 'regional' | 'industry' | 'competitor' | 'risk' | 'chat' | 'tasks' | 'alerts';

function App() {
  const { isConfigured, setConfigured, setKeys } = useKeyStore();
  const { status } = useAvatarStore();
  const [isLoading, setIsLoading] = useState(true);

  // AI数据相关状态
  const [currentScenario, setCurrentScenario] = useState<string>('normal');
  const [aiData, setAiData] = useState<AIGeneratedData | null>(null);
  const [previousData, setPreviousData] = useState<AIGeneratedData | null>(null);
  const [isGeneratingData, setIsGeneratingData] = useState(false);
  const [dataError, setDataError] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | undefined>(undefined);

  const lastDataRef = useRef<AIGeneratedData | null>(null);

  const getStatusText = () => {
    switch (status) {
      case 'connected': return '已连接';
      case 'connecting': return '连接中...';
      case 'error': return '连接失败';
      default: return '未连接';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // 数字人播报
  const handleAvatarSpeak = (text: string) => {
    if (status === 'connected') {
      try {
        AvatarController.speak({ text });
      } catch (error) {
        console.error('[Avatar] Speak error:', error);
      }
    }
  };

  // 生成播报内容
  const generateBroadcastContent = (): string => {
    if (!aiData || !aiData.metrics) return '当前暂无业务数据可供播报';

    const metrics = aiData.metrics;
    const totalRevenue = metrics.find(m => m.name === '总收入');
    const profitMargin = metrics.find(m => m.name === '利润率');
    const newCustomers = metrics.find(m => m.name === '新客户数');
    const customerRetention = metrics.find(m => m.name === '客户留存率');

    let content = '尊敬的用户，以下是最新的业务数据分析结果。';

    // 核心指标播报
    if (totalRevenue) {
      const revenueWan = (totalRevenue.value / 10000).toFixed(0);
      const trend = totalRevenue.changePercent > 0 ? '实现了' : totalRevenue.changePercent < 0 ? '出现了' : '保持';
      const changeType = totalRevenue.changePercent > 0 ? '增长' : totalRevenue.changePercent < 0 ? '下降' : '持平';
      content += `本周期总收入达到${revenueWan}万元，较上一周期${trend}${Math.abs(totalRevenue.changePercent).toFixed(2)}%的${changeType}。`;
    }

    if (profitMargin) {
      const mtrend = profitMargin.changePercent > 0 ? '上升了' : profitMargin.changePercent < 0 ? '下降了' : '维持在';
      content += `利润率方面，目前为${profitMargin.value.toFixed(2)}%，较上期${mtrend}${Math.abs(profitMargin.changePercent).toFixed(2)}个百分点。`;
    }

    if (newCustomers) {
      const utrend = newCustomers.changePercent > 0 ? '增长了' : newCustomers.changePercent < 0 ? '减少了' : '稳定在';
      content += `新客户获取情况良好，本周期新增客户${newCustomers.value.toLocaleString()}人，较上期${utrend}${Math.abs(newCustomers.changePercent).toFixed(2)}%。`;
    }

    if (customerRetention) {
      const ctrend = customerRetention.changePercent > 0 ? '提升了' : customerRetention.changePercent < 0 ? '下降了' : '维持在';
      content += `客户留存表现${customerRetention.changePercent > 0 ? '优秀' : customerRetention.changePercent < 0 ? '需要关注' : '稳定'}，当前留存率为${customerRetention.value.toFixed(2)}%，较上期${ctrend}${Math.abs(customerRetention.changePercent).toFixed(2)}个百分点。`;
    }

    // 预警播报
    if (aiData.alerts && aiData.alerts.length > 0) {
      content += `特别需要关注的是，`;
      aiData.alerts.slice(0, 2).forEach((alert, index) => {
        content += alert.message;
        if (index < Math.min(aiData.alerts.length, 2) - 1) {
          content += '，此外';
        }
      });
      content += '。';
    }

    // 整体趋势
    if (aiData.insight) {
      content += `综合分析来看，${aiData.insight}`;
    }

    // 业务建议（简短）
    if (aiData.suggestion) {
      const shortSuggestion = aiData.suggestion.split('。')[0] + '。';
      content += `基于当前数据表现，建议${shortSuggestion}`;
    }

    content += '以上就是本次数据播报的全部内容，感谢您的聆听。';

    return content;
  };

  // 手动播报
  const handleBroadcast = () => {
    if (isSpeaking) return;

    const content = generateBroadcastContent();
    setIsSpeaking(true);
    handleAvatarSpeak(content);

    // 模拟播报结束（实际应该从SDK获取播报状态）
    setTimeout(() => {
      setIsSpeaking(false);
    }, 30000);
  };

  // 生成数据并播报
  const generateData = async (scenario: string, speak: boolean = true) => {
    setIsGeneratingData(true);
    setDataError('');

    try {
      const data = await dataService.generateData({
        scenario: scenario as any,
        useAI: true, // 使用AI生成数据
        previousData: previousData ? { metrics: previousData.metrics } : undefined
      });

      setAiData(data);
      setLastUpdateTime(Date.now());

      // 保存为上期数据
      if (lastDataRef.current) {
        setPreviousData(lastDataRef.current);
      }
      lastDataRef.current = data;

      // 自动播报数据摘要
      if (speak && data.insight) {
        setTimeout(() => {
          handleAvatarSpeak(`数据更新完毕。${data.insight}`);
        }, 1000);
      }
    } catch (error: any) {
      console.error('[App] Generate data error:', error);
      setDataError(error.message || '数据生成失败');
    } finally {
      setIsGeneratingData(false);
    }
  };

  const handleScenarioChange = (scenario: string) => {
    setCurrentScenario(scenario);
    generateData(scenario, true);
  };

  useEffect(() => {
    if (isConfigured) {
      generateData('normal', false);
    }
  }, [isConfigured]);

  useEffect(() => {
    const keys = keyService.getApiKeys();
    if (keys) {
      setKeys(keys);
      setConfigured(true);
    }
    setIsLoading(false);
  }, [setKeys, setConfigured]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  if (!isConfigured) {
    return <ApiKeyConfig onConfigured={() => setConfigured(true)} />;
  }

  const iconMap: Record<string, string> = {
    '总收入': '💰', '新客户数': '👥', '客户留存率': '🔄',
    '平均订单价值': '💎', '运营成本': '📊', '利润率': '📈',
    '市场份额': '🏆', '客户满意度': '😊', '员工生产力': '⚡'
  };

  // 计算目标完成度（用于仪表盘）
  const calculateTargetCompletion = () => {
    if (!aiData?.metrics) return 50;
    const totalRevenue = aiData.metrics.find(m => m.name === '总收入');
    if (!totalRevenue) return 50;
    // 假设目标是1000万
    return Math.min((totalRevenue.value / 10000000) * 100, 100);
  };

  return (
    <DashboardLayout lastUpdateTime={lastUpdateTime}>
      {/* AI讲解员 - 固定在屏幕右下角 */}
      <div className="fixed right-8 bottom-8 w-[15vw] h-[15vw] min-w-[200px] min-h-[200px] z-50 pointer-events-none">
        <div className="relative w-full h-full">
          {/* 半透明背景圆 */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-full backdrop-blur-sm border-2 border-white/30 shadow-2xl"></div>

          {/* 数字人容器 */}
          <div className="absolute inset-2 rounded-full overflow-hidden pointer-events-auto">
            <AvatarContainer />
          </div>

          {/* 状态指示器 */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm px-4 py-1 rounded-full border border-white/20">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${status === 'connecting' ? 'animate-pulse' : ''}`} />
              <span className="text-white text-xs font-medium">{getStatusText()}</span>
              <span className="text-white/40 text-xs">|</span>
              <span className="text-white/70 text-xs">AI讲解员</span>
            </div>
          </div>

          {/* 连接控制按钮 */}
          <div className="absolute -top-3 right-0 pointer-events-auto">
            <button
              onClick={() => AvatarController.disconnect()}
              className="bg-red-500/80 hover:bg-red-500 text-white px-3 py-1 rounded-full text-xs border border-white/30 backdrop-blur-sm transition"
            >
              断开
            </button>
          </div>

          {/* 播报按钮 */}
          {status === 'connected' && (
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 pointer-events-auto">
              <button
                onClick={handleBroadcast}
                disabled={isSpeaking || !aiData}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium border border-white/30 backdrop-blur-sm transition-all shadow-lg ${
                  isSpeaking
                    ? 'bg-gray-500/80 text-white cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
                }`}
              >
                <span className={isSpeaking ? 'animate-pulse' : ''}>{isSpeaking ? '🔊' : '📢'}</span>
                <span>{isSpeaking ? '播报中...' : '开始播报'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="space-y-6">
        {/* 场景切换和控制栏 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <ScenarioSwitcher
              onScenarioChange={handleScenarioChange}
              currentScenario={currentScenario}
              isGeneratingData={isGeneratingData}
            />
          </div>
          
          <div className="flex gap-3">
            {(['overview', 'regional', 'industry', 'competitor', 'risk'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  viewMode === mode
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700/50 text-white/70 hover:bg-gray-700/80'
                }`}
              >
                {mode === 'overview' ? '📊 总览' : ''}
                {mode === 'regional' ? '🌍 地区' : ''}
                {mode === 'industry' ? '🏭 行业' : ''}
                {mode === 'competitor' ? '⚔️ 竞争' : ''}
                {mode === 'risk' ? '⚠️ 风险' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* 核心指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {aiData?.metrics.map((metric, index) => (
            <MetricCard
              key={index}
              title={metric.name}
              value={metric.value}
              unit={metric.unit}
              change={metric.change}
              changePercent={metric.changePercent}
              icon={iconMap[metric.name] || '📊'}
            />
          )) || <div className="col-span-full text-white/60 text-center py-16">数据加载中...</div>}
        </div>

        {/* 主数据展示区 */}
        <div className="space-y-8">
          {viewMode === 'overview' && (
            <>
              {/* 趋势图和目标完成度 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-emerald-500/30 shadow-lg">
                  <TrendChart title="总收入趋势（12小时）" data={aiData?.trend || []} height={320} />
                </div>
                <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-emerald-500/30 shadow-lg">
                  <GaugeChart title="目标完成度" value={calculateTargetCompletion()} max={100} unit="%" height={320} />
                </div>
              </div>

              {/* 行业和地区分布 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-emerald-500/30 shadow-lg">
                  <PieChart title="行业营收分布" data={aiData?.industryData?.map(d => ({ name: d.name, value: d.revenue })) || []} height={320} />
                </div>
                <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-emerald-500/30 shadow-lg">
                  <PieChart title="地区营收分布" data={aiData?.regionalData?.map(d => ({ name: d.name, value: d.value })) || []} height={320} />
                </div>
              </div>

              {/* AI洞察和建议 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {aiData?.insight && (
                  <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-emerald-500/30 shadow-lg">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <span>🧠</span>
                      <span>AI 智能洞察</span>
                    </h3>
                    <p className="text-gray-300 leading-relaxed">{aiData.insight}</p>
                  </div>
                )}
                {aiData?.suggestion && (
                  <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-emerald-500/30 shadow-lg">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <span>💎</span>
                      <span>战略业务建议</span>
                    </h3>
                    <p className="text-gray-300 leading-relaxed whitespace-pre-line">{aiData.suggestion}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {viewMode === 'regional' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-emerald-500/30 shadow-lg">
                <BarChart title="各地区营收对比" data={aiData?.regionalData?.map(d => ({ name: d.name, value: d.value })) || []} height={420} />
              </div>
              <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-emerald-500/30 shadow-lg">
                <BarChart title="各地区增长率" data={aiData?.regionalData?.map(d => ({ name: d.name, value: d.changePercent })) || []} height={420} />
              </div>
            </div>
          )}

          {viewMode === 'industry' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-emerald-500/30 shadow-lg">
                <BarChart title="各行业营收对比" data={aiData?.industryData?.map(d => ({ name: d.name, value: d.revenue })) || []} height={420} />
              </div>
              <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-emerald-500/30 shadow-lg">
                <BarChart title="各行业利润率" data={aiData?.industryData?.map(d => ({ name: d.name, value: d.profitMargin })) || []} height={420} />
              </div>
            </div>
          )}

          {viewMode === 'competitor' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-emerald-500/30 shadow-lg">
                <PieChart title="市场份额分布" data={aiData?.competitorData?.map(d => ({ name: d.name, value: d.marketShare })) || []} height={420} />
              </div>
              <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-emerald-500/30 shadow-lg">
                <BarChart title="竞争对手增长率" data={aiData?.competitorData?.map(d => ({ name: d.name, value: d.growthRate * 100 })) || []} height={420} />
              </div>
            </div>
          )}

          {viewMode === 'risk' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-emerald-500/30 shadow-lg">
                <RadarChart title="风险评估" data={aiData?.riskData?.map(d => ({ name: d.category, value: d.level })) || []} height={420} />
              </div>
              <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-emerald-500/30 shadow-lg">
                <div className="h-full flex flex-col">
                  <h3 className="text-xl font-bold text-white mb-6">风险详情</h3>
                  <div className="flex-1 space-y-5">
                    {aiData?.riskData?.map((risk, index) => (
                      <div key={index} className="bg-slate-700/60 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-medium text-white">{risk.category}</span>
                          <span className={`px-3 py-1 rounded text-xs font-medium ${
                            risk.level >= 4 ? 'bg-red-500/20 text-red-400' :
                            risk.level >= 3 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {risk.impact}
                          </span>
                        </div>
                        <div className="w-full bg-slate-600 rounded-full h-2.5">
                          <div className={`h-2.5 rounded-full ${
                            risk.level >= 4 ? 'bg-red-500' :
                            risk.level >= 3 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`} style={{ width: `${(risk.level / 5) * 100}%` }}></div>
                        </div>
                        <div className="mt-2 text-xs text-gray-400">风险等级: {risk.level}/5</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 预警信息 */}
        {aiData?.alerts && aiData.alerts.length > 0 && (
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-emerald-500/30 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span>🚨</span>
              <span>智能预警系统</span>
            </h3>
            <div className="space-y-4">
              {aiData.alerts.map((alert, index) => (
                <div key={index} className={`rounded-lg p-4 border ${
                  alert.level === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                  alert.level === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                  'bg-blue-500/10 border-blue-500/30'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className={`mt-0.5 text-xl ${
                      alert.level === 'critical' ? 'text-red-400' :
                      alert.level === 'warning' ? 'text-yellow-400' :
                      'text-blue-400'
                    }`}>
                      {alert.level === 'critical' ? '🔥' : alert.level === 'warning' ? '⚠️' : 'ℹ️'}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium mb-2 ${
                        alert.level === 'critical' ? 'text-red-400' :
                        alert.level === 'warning' ? 'text-yellow-400' :
                        'text-blue-400'
                      }`}>
                        {alert.level === 'critical' ? '严重预警' : alert.level === 'warning' ? '警告信息' : '系统提示'}
                      </div>
                      <div className="text-gray-300">{alert.message}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default App;
