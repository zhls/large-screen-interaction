import React, { useState, useEffect } from 'react';
import dataService from '../../services/dataService';

export interface Scenario {
  value: string;
  label: string;
  description: string;
}

interface ScenarioSwitcherProps {
  onScenarioChange: (scenario: string) => void;
  currentScenario: string;
  isGeneratingData?: boolean;
}

export const ScenarioSwitcher: React.FC<ScenarioSwitcherProps> = ({
  onScenarioChange,
  currentScenario,
  isGeneratingData = false
}) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadScenarios();
  }, []);

  // 进度条逻辑
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let currentProgress = 0;

    if (isGeneratingData) {
      // 重置进度
      setProgress(0);
      currentProgress = 0;

      // 每100ms增加0.25%，40秒完成
      interval = setInterval(() => {
        currentProgress += 0.25;
        if (currentProgress >= 100) {
          currentProgress = 100;
          setProgress(100);
          clearInterval(interval);
        } else {
          setProgress(currentProgress);
        }
      }, 100);
    } else {
      // 重置进度
      setProgress(0);
      if (interval) {
        clearInterval(interval);
      }
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isGeneratingData]);

  const loadScenarios = async () => {
    setLoading(true);
    try {
      const data = await dataService.getScenarios();
      setScenarios(data);
    } catch (error) {
      console.error('[ScenarioSwitcher] Load scenarios error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScenarioIcon = (value: string) => {
    switch (value) {
      case 'normal': return '📊';
      case 'promotion': return '🎉';
      case 'off_season': return '📉';
      case 'anomaly': return '⚠️';
      default: return '📊';
    }
  };

  const getScenarioColor = (value: string) => {
    switch (value) {
      case 'normal': return 'from-blue-500 to-purple-500';
      case 'promotion': return 'from-green-500 to-emerald-500';
      case 'off_season': return 'from-yellow-500 to-orange-500';
      case 'anomaly': return 'from-red-500 to-pink-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div>
      <h3 className="text-white text-lg font-semibold mb-3 flex items-center gap-2">
        <span>🎬</span>
        <span>场景切换</span>
      </h3>

      {/* 场景按钮 */}
      {loading ? (
        <div className="text-white/60 text-sm">加载中...</div>
      ) : (
        <div className={`flex gap-3 ${isGeneratingData ? 'opacity-50 pointer-events-none' : ''}`}>
          {scenarios.map((scenario) => (
            <button
              key={scenario.value}
              onClick={() => !isGeneratingData && onScenarioChange(scenario.value)}
              className={`
                relative px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2
                ${currentScenario === scenario.value
                  ? `bg-gradient-to-r ${getScenarioColor(scenario.value)} text-white shadow-lg scale-105`
                  : 'bg-black/50 text-white/70 hover:bg-black/40 hover:text-white'
                }
                ${isGeneratingData ? 'cursor-not-allowed' : ''}
              `}
            >
              <span className="text-xl">{getScenarioIcon(scenario.value)}</span>
              <span className="text-sm font-medium">{scenario.label}</span>
              {currentScenario === scenario.value && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white shadow"></div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 进度条和状态 */}
      {isGeneratingData && (
        <div className="mt-3">
          <div className="flex items-center gap-2 text-sm font-normal text-blue-300 mb-2">
            <span className="animate-spin">⏳</span>
            <span>正在生成数据...</span>
            <span className="text-white/60">({progress.toFixed(0)}%)</span>
          </div>
          <div className="h-1 bg-black/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-3 text-white/70 text-sm">
        {scenarios.find(s => s.value === currentScenario)?.description || '选择一个场景切换数据展示'}
      </div>
    </div>
  );
};

export default ScenarioSwitcher;
