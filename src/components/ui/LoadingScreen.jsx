const LoadingScreen = () => (
  <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-50">
    <div className="text-center space-y-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mx-auto animate-pulse">
        <span className="text-white font-bold text-lg">KP</span>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-300">Laporan Keuangan</p>
        <p className="text-xs text-slate-500">200 Tahun Panyeppen</p>
      </div>
      <div className="flex items-center justify-center gap-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  </div>
)

export default LoadingScreen
