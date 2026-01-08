import React, { ReactNode } from 'react';
import { useScale } from '../../hooks/useScale';

interface DashboardLayoutProps {
  children: ReactNode;
  lastUpdateTime?: number;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, lastUpdateTime }) => {
  const scale = useScale();

  // 格式化最后更新时间
  const formatLastUpdateTime = (timestamp?: number) => {
    if (!timestamp) return '--:--:--';
    return new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false });
  };

  // 更新时间
  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeEl = document.getElementById('current-time');

      if (timeEl) {
        timeEl.textContent = now.toLocaleTimeString('zh-CN', { hour12: false });
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950 h-screen w-screen overflow-hidden flex flex-col"
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width: `${100 / scale}%`,
        height: `${100 / scale}%`
      }}
    >
      {/* 顶部标题栏 */}
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 flex justify-between items-center flex-shrink-0 border-b border-emerald-500/30">
        <div className="flex items-center gap-4">
          <div className="text-4xl">💹</div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">智能业务数据中心</h1>
            <p className="text-sm opacity-90">AI驱动的实时数据洞察平台</p>
          </div>
        </div>

        <div className="flex items-end gap-6">
          <div className="text-right space-y-1">
            <div className="text-2xl font-bold font-mono" id="current-time">00:00:00</div>
            <div className="text-xs opacity-80">{new Date().toLocaleDateString('zh-CN')}</div>
          </div>
          
          <div className="text-right space-y-1">
            <div className="text-sm font-medium">数据状态</div>
            <div className="text-xs opacity-80 space-x-3">
              <span className="flex items-center gap-1 justify-end">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                <span>实时更新</span>
              </span>
              <span>上次: {formatLastUpdateTime(lastUpdateTime)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
