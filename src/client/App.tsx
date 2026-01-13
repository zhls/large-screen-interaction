import React, { useEffect, useState, useRef } from 'react';
import { ApiKeyConfig } from './components/Config/ApiKeyConfig';
import { DashboardLayout } from './components/Dashboard/DashboardLayout';
import { AvatarContainer } from './components/Avatar/AvatarContainer';
import { MetricCard } from './components/Dashboard/MetricCard';
import { TrendChart, BarChart, PieChart, GaugeChart } from './components/Chart';
import { ScenarioSwitcher } from './components/Data/ScenarioSwitcher';
import { RegionalChart } from './components/Dashboard/RegionalChart';
import { ProductChart } from './components/Dashboard/ProductChart';
import { ChatBox } from './components/Chat/ChatBox';
import { TaskPanel } from './components/Dashboard/TaskPanel';
import { AlertSystem } from './components/Dashboard/AlertSystem';
import keyService from './services/keyService';
import dataService from './services/dataService';
import { useKeyStore } from './store/keyStore';
import { useAvatarStore } from './store/avatarStore';
import AvatarController from './components/Avatar/AvatarController';
import type { AIGeneratedData } from './services/dataService';

type ViewMode = 'overview' | 'regional' | 'product' | 'chat' | 'tasks' | 'alerts';

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
    if (!aiData || !aiData.metrics) return '暂无数据可播报';

    const metrics = aiData.metrics;
    const revenue = metrics.find(m => m.name === '营业收入');
    const margin = metrics.find(m => m.name === '毛利率');
    const users = metrics.find(m => m.name === '活跃用户');
    const orders = metrics.find(m => m.name === '订单量');

    let content = '现在为您播报本次业务数据概况。';

    // 核心指标播报
    if (revenue) {
      const revenueWan = (revenue.value / 10000).toFixed(0);
      const trend = revenue.changePercent > 0 ? '增长' : revenue.changePercent < 0 ? '下降' : '持平';
      content += `营业收入为${revenueWan}万元，较上期${trend}${Math.abs(revenue.changePercent).toFixed(2)}%。`;
    }

    if (margin) {
      const mtrend = margin.changePercent > 0 ? '上升' : margin.changePercent < 0 ? '下降' : '持平';
      content += `毛利率为${margin.value.toFixed(2)}%，较上期${mtrend}${Math.abs(margin.changePercent).toFixed(2)}个百分点。`;
    }

    if (users) {
      const utrend = users.changePercent > 0 ? '增长' : users.changePercent < 0 ? '下降' : '持平';
      content += `活跃用户数为${users.value.toLocaleString()}人，较上期${utrend}${Math.abs(users.changePercent).toFixed(2)}%。`;
    }

    if (orders) {
      const otrend = orders.changePercent > 0 ? '增长' : orders.changePercent < 0 ? '下降' : '持平';
      content += `订单量为${orders.value.toLocaleString()}单，较上期${otrend}${Math.abs(orders.changePercent).toFixed(2)}%。`;
    }

    // 预警播报
    if (aiData.alerts && aiData.alerts.length > 0) {
      content += `需要注意的是，`;
      aiData.alerts.slice(0, 2).forEach((alert, index) => {
        content += alert.message;
        if (index < Math.min(aiData.alerts.length, 2) - 1) {
          content += '；';
        }
      });
      content += '。';
    }

    // 整体趋势
    if (aiData.insight) {
      content += aiData.insight;
    }

    // 业务建议（简短）
    if (aiData.suggestion) {
      const shortSuggestion = aiData.suggestion.split('。')[0] + '。';
      content += shortSuggestion;
    }

    content += '播报完毕。';

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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  if (!isConfigured) {
    return <ApiKeyConfig onConfigured={() => setConfigured(true)} />;
  }

  const iconMap: Record<string, string> = {
    '营业收入': '💰', '订单量': '📦', '毛利率': '📈',
    '活跃用户': '👥', '转化率': '🎯', '客单价': '💎', '复购率': '🔄'
  };

  // 计算目标完成度（用于仪表盘）
  const calculateTargetCompletion = () => {
    if (!aiData?.metrics) return 50;
    const revenue = aiData.metrics.find(m => m.name === '营业收入');
    if (!revenue) return 50;
    // 假设目标是600万
    return Math.min((revenue.value / 6000000) * 100, 100);
  };

  return (
    <DashboardLayout lastUpdateTime={lastUpdateTime}>
      <div className="h-full flex gap-3">
        {/* 主要内容区 - 占4/6 */}
        <div className="w-[66.666%] min-h-0 flex flex-col gap-3">
        {/* 顶部控制区 */}
        <div className="grid grid-cols-12 gap-4 flex-shrink-0">
          {/* 左侧：场景切换 */}
          <div className="col-span-8 bg-black/40 backdrop-blur-lg rounded-lg p-4 border border-white/10">
            <ScenarioSwitcher
              onScenarioChange={handleScenarioChange}
              currentScenario={currentScenario}
              isGeneratingData={isGeneratingData}
            />
          </div>

          {/* 右侧：视图切换 */}
          <div className="col-span-4">
            <div className="grid grid-cols-2 gap-2 h-full">
              {(['overview', 'regional', 'product', 'alerts'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`py-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-2 ${
                    viewMode === mode
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {mode === 'overview' ? '📊 运营总览' : ''}
                  {mode === 'regional' ? '🌍 区域分析' : ''}
                  {mode === 'product' ? '📦 产品表现' : ''}
                  {mode === 'alerts' ? '🔔 异常预警' : ''}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 指标卡片区域 - 4列布局 */}
        <div className="grid grid-cols-4 gap-3 flex-shrink-0">
          {aiData?.metrics.slice(0, 8).map((metric, index) => (
            <MetricCard
              key={index}
              title={metric.name}
              value={metric.value}
              unit={metric.unit}
              change={metric.change}
              changePercent={metric.changePercent}
              icon={iconMap[metric.name] || '📊'}
            />
          )) || <div className="col-span-4 text-white/60 text-center py-6">数据加载中...</div>}
        </div>

        {/* 主内容区 */}
        <div className="flex-1 min-h-0">
          {viewMode === 'overview' && (
            <div className="grid grid-cols-3 gap-4 h-full">
              {/* 左侧：趋势图 */}
              <div className="bg-black/40 backdrop-blur-lg rounded-lg p-4 border border-white/10 col-span-2">
                <TrendChart title="12小时营收趋势分析" data={aiData?.trend || []} height={320} />
              </div>

              {/* 右侧：仪表盘 */}
              <div className="bg-black/40 backdrop-blur-lg rounded-lg p-4 border border-white/10">
                <GaugeChart title="营收目标达成率" value={calculateTargetCompletion()} max={100} unit="%" height={320} />
              </div>

              {/* 下方：AI洞察面板 */}
              <div className="bg-black/40 backdrop-blur-lg rounded-lg p-5 border border-white/10 col-span-3">
                <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
                  <span>🧠</span><span>智能数据分析</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiData?.insight && (
                    <div className="bg-black/60 rounded-lg p-4">
                      <p className="text-white/90 text-xs leading-relaxed">{aiData.insight}</p>
                    </div>
                  )}
                  {aiData?.suggestion && (
                    <div className="bg-black/60 rounded-lg p-4">
                      <p className="text-white/90 text-xs leading-relaxed whitespace-pre-line">{aiData.suggestion}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'regional' && (
            <div className="grid grid-cols-1 gap-4 h-full">
              <div className="bg-black/40 backdrop-blur-lg rounded-lg p-4 border border-white/10">
                <h3 className="text-white text-sm font-semibold mb-3">区域市场分析</h3>
                <div className="grid grid-cols-2 gap-4 h-[400px]">
                  <div>
                    <BarChart title="区域营收对比" data={aiData?.regionalData?.map(d => ({ name: d.name, value: d.value })) || []} height={380} />
                  </div>
                  <div>
                    <PieChart title="区域市场占比" data={aiData?.regionalData?.map(d => ({ name: d.name, value: d.value })) || []} height={380} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'product' && (
            <div className="grid grid-cols-1 gap-4 h-full">
              <div className="bg-black/40 backdrop-blur-lg rounded-lg p-4 border border-white/10">
                <h3 className="text-white text-sm font-semibold mb-3">产品类别表现</h3>
                <div className="grid grid-cols-2 gap-4 h-[400px]">
                  <div>
                    <BarChart title="品类营收排名" data={aiData?.productData?.map(d => ({ name: d.name, value: d.revenue })) || []} height={380} />
                  </div>
                  <div>
                    <PieChart title="品类市场份额" data={aiData?.productData?.map(d => ({ name: d.name, value: d.revenue })) || []} height={380} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'chat' && (
            <div className="h-full">
              <ChatBox currentData={aiData} onSpeak={handleAvatarSpeak} />
            </div>
          )}

          {viewMode === 'tasks' && (
            <div className="h-full">
              <TaskPanel currentData={aiData} />
            </div>
          )}

          {viewMode === 'alerts' && (
            <div className="bg-black/40 backdrop-blur-lg rounded-lg p-4 border border-white/10 h-full">
              <h3 className="text-white text-sm font-semibold mb-3">异常预警监控</h3>
              <AlertSystem currentData={aiData} />
            </div>
          )}
        </div>

        </div>
        
        {/* 右侧：数字人 - 占2/6 */}
        <div className="w-[33.333%] min-w-[300px] flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-[300px] flex-grow flex flex-col items-center justify-center">
            <div className="relative w-full aspect-square" style={{ height: '80%' }}>
              {/* 半透明背景圆 */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-teal-500/20 to-blue-500/20 rounded-full backdrop-blur-sm border-2 border-white/40 shadow-xl"></div>

              {/* 数字人容器 */}
              <div className="absolute inset-2 rounded-full overflow-hidden">
                <AvatarContainer />
              </div>

              {/* 状态指示器 */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm px-4 py-1 rounded-full border border-white/30">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${status === 'connecting' ? 'animate-pulse' : ''}`} />
                  <span className="text-white text-xs font-medium">{getStatusText()}</span>
                  <span className="text-white/40 text-xs">|</span>
                  <span className="text-white/70 text-xs">AI讲解员</span>
                </div>
              </div>

              {/* 连接控制按钮 */}
              <div className="absolute -top-3 right-0">
                <button
                  onClick={() => AvatarController.disconnect()}
                  className="bg-red-500/80 hover:bg-red-500 text-white px-3 py-1 rounded-full text-xs border border-white/30 backdrop-blur-sm transition"
                >
                  断开
                </button>
              </div>
            </div>

            {/* 播报按钮 */}
            {status === 'connected' && (
              <div className="mt-6 w-full max-w-[200px]">
                <button
                  onClick={handleBroadcast}
                  disabled={isSpeaking || !aiData}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-2 rounded-full text-sm font-medium border border-white/30 backdrop-blur-sm transition-all shadow-lg ${
                    isSpeaking
                      ? 'bg-gray-500/80 text-white cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white'
                  }`}
                >
                  <span className={isSpeaking ? 'animate-pulse' : ''}>{isSpeaking ? '🔊' : '📢'}</span>
                  <span>{isSpeaking ? '播报中...' : '开始播报'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default App;
