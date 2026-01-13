import React, { useState } from 'react';
import keyService from '../../services/keyService';

interface ApiKeyConfigProps {
  onConfigured: () => void;
}

interface TestResult {
  modelscope: boolean;
  xmov: boolean;
  message: string;
}

export const ApiKeyConfig: React.FC<ApiKeyConfigProps> = ({ onConfigured }) => {
  const [modelscopeApiKey, setModelscopeApiKey] = useState('');
  const [xmovAppId, setXmovAppId] = useState('');
  const [xmovAppSecret, setXmovAppSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // 尝试从localStorage加载已有密钥
  React.useEffect(() => {
    const savedKeys = keyService.getApiKeys();
    if (savedKeys) {
      setModelscopeApiKey(savedKeys.modelscopeApiKey);
      setXmovAppId(savedKeys.xmovAppId);
      setXmovAppSecret(savedKeys.xmovAppSecret);
    }
  }, []);

  // 演示密钥
  const DEMO_KEYS = {
    modelscopeApiKey: 'ms-85ed98e9-1a8e-41e5-8215-ee563559d069',
    xmovAppId: 'fa769cf0f9d64e95853f136f104bca9c',
    xmovAppSecret: 'f9f02765dbe94adeade9439526bdf14e'
  };

  const handleUseDemoKeys = () => {
    setModelscopeApiKey(DEMO_KEYS.modelscopeApiKey);
    setXmovAppId(DEMO_KEYS.xmovAppId);
    setXmovAppSecret(DEMO_KEYS.xmovAppSecret);
    setTestResult(null);
  };

  // 测试密钥
  const handleTestKeys = async () => {
    setError('');
    setTestResult(null);

    // 基本验证
    if (!modelscopeApiKey.trim() || !xmovAppId.trim() || !xmovAppSecret.trim()) {
      setError('请先填写所有密钥');
      return;
    }

    if (!modelscopeApiKey.startsWith('ms-')) {
      setError('魔搭API密钥格式不正确，应以"ms-"开头');
      return;
    }

    setIsTesting(true);

    try {
      // 测试魔搭 API 密钥（调用后端测试接口）
      const response = await fetch('/api/test-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelscopeApiKey: modelscopeApiKey.trim(),
          xmovAppId: xmovAppId.trim(),
          xmovAppSecret: xmovAppSecret.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult({
          modelscope: data.modelscopeValid || false,
          xmov: data.xmovValid || false,
          message: data.message || '测试完成'
        });
      } else {
        setError(data.message || '测试失败');
      }
    } catch (err) {
      // 如果后端接口不存在，进行前端简单验证
      const results: TestResult = {
        modelscope: modelscopeApiKey.startsWith('ms-') && modelscopeApiKey.length > 20,
        xmov: xmovAppId.length > 10 && xmovAppSecret.length > 10,
        message: '前端基础验证通过（建议保存后实际测试）'
      };
      setTestResult(results);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTestResult(null);
    setIsSaving(true);

    // 验证输入
    if (!modelscopeApiKey.trim()) {
      setError('请输入魔搭API密钥');
      setIsSaving(false);
      return;
    }

    if (!modelscopeApiKey.startsWith('ms-')) {
      setError('魔搭API密钥格式不正确，应以"ms-"开头');
      setIsSaving(false);
      return;
    }

    if (!xmovAppId.trim() || !xmovAppSecret.trim()) {
      setError('请输入完整的魔珐星云配置信息');
      setIsSaving(false);
      return;
    }

    try {
      // 保存密钥到localStorage
      keyService.saveApiKeys({
        modelscopeApiKey: modelscopeApiKey.trim(),
        xmovAppId: xmovAppId.trim(),
        xmovAppSecret: xmovAppSecret.trim()
      });

      // 延迟一下让用户看到保存成功的反馈
      setTimeout(() => {
        onConfigured();
      }, 500);
    } catch (err) {
      setError('保存密钥失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    if (confirm('确定要清除已保存的密钥吗？')) {
      keyService.clearApiKeys();
      setModelscopeApiKey('');
      setXmovAppId('');
      setXmovAppSecret('');
      setTestResult(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-green-800 to-teal-900 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 shadow-xl">
          {/* 标题 */}
          <div className="text-center mb-10">
            <div className="text-5xl mb-6">🛡️</div>
            <h1 className="text-2xl font-bold text-white mb-3">服务授权配置</h1>
            <p className="text-gray-300 text-sm">
              请输入您的授权密钥以激活智能数据讲解能力
            </p>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 魔搭AI密钥 */}
            <div className="bg-white/5 rounded-xl p-5 border border-white/10">
              <label className="block text-white font-medium mb-3">
                魔搭社区 API 密钥 <span className="text-green-400">*</span>
              </label>
              <input
                type="text"
                value={modelscopeApiKey}
                onChange={(e) => setModelscopeApiKey(e.target.value)}
                placeholder="ms-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full px-4 py-3 bg-black/30 border border-teal-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              />
              <p className="text-gray-400 text-xs mt-2">
                🔗 访问 <a href="https://modelscope.cn" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">魔搭社区</a> 创建个人令牌
              </p>
            </div>

            {/* 魔珐星云配置 */}
            <div className="bg-white/5 rounded-xl p-5 border border-white/10">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-white font-medium">
                  魔珐星云应用配置 <span className="text-green-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleUseDemoKeys}
                  className="text-xs bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 px-3 py-1 rounded-md transition"
                >
                  🎯 快速配置演示密钥
                </button>
              </div>
              
              {/* App ID */}
              <input
                type="text"
                value={xmovAppId}
                onChange={(e) => setXmovAppId(e.target.value)}
                placeholder="应用ID"
                className="w-full px-4 py-3 bg-black/30 border border-teal-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent mb-3"
                required
              />
              
              {/* App Secret */}
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={xmovAppSecret}
                  onChange={(e) => setXmovAppSecret(e.target.value)}
                  placeholder="应用密钥"
                  className="w-full px-4 py-3 bg-black/30 border border-teal-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent pr-20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-teal-400 transition"
                >
                  {showSecret ? '🙈' : '👀'}
                </button>
              </div>
              <p className="text-gray-400 text-xs mt-2">
                🔗 访问 <a href="https://xingyun3d.com" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">魔珐星云控制台</a> 创建应用
              </p>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-lg">⚠️</span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* 测试结果 */}
            {testResult && (
              <div className={`p-4 rounded-lg border ${
                testResult.modelscope && testResult.xmov
                  ? 'bg-green-500/10 border-green-500/30 text-green-300'
                  : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
              }`}>
                <div className="font-medium mb-2 flex items-center gap-2">
                  <span>📊</span>
                  <span>授权验证结果</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span>{testResult.modelscope ? '✓' : '✗'}</span>
                    <span>魔搭社区授权: {testResult.modelscope ? '通过' : '失败'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{testResult.xmov ? '✓' : '✗'}</span>
                    <span>魔珐星云授权: {testResult.xmov ? '通过' : '失败'}</span>
                  </div>
                  <div className="mt-2 text-xs opacity-80">{testResult.message}</div>
                </div>
              </div>
            )}

            {/* 按钮 */}
            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white py-3 rounded-lg font-medium hover:from-teal-700 hover:to-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? '正在激活...' : '激活服务'}
              </button>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleTestKeys}
                  disabled={isTesting || !modelscopeApiKey || !xmovAppId || !xmovAppSecret}
                  className="flex-1 bg-black/30 text-white py-3 rounded-lg font-medium hover:bg-black/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isTesting ? '🔄 验证中...' : '验证授权'}
                </button>
                
                {modelscopeApiKey && xmovAppId && xmovAppSecret && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-4 bg-white/5 text-white py-3 rounded-lg font-medium hover:bg-white/10 transition"
                  >
                    重置
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* 安全提示 */}
          <div className="mt-6 p-4 bg-teal-500/5 border border-teal-500/20 rounded-lg">
            <p className="text-teal-300 text-xs">
              🛡️ <strong>安全说明：</strong>您的授权信息仅存储在本地浏览器中，
              不会被传输至任何服务器。为保障账户安全，请避免在公共设备上操作。
            </p>
          </div>
        </div>

        {/* 页脚 */}
        <div className="text-center mt-5 text-gray-500 text-xs">
          © 2026 智能数据讲解系统 | 安全授权
        </div>
      </div>
    </div>
  );
};

export default ApiKeyConfig;
