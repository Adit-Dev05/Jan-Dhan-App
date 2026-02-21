import React from 'react';

export default function KPICard({ title, value, subtitle, icon: Icon, trend, trendLabel, variant = 'default', children }) {
    const variants = {
        default: 'border-border-card',
        success: 'border-accent-green/30',
        danger: 'border-accent-red/30',
        warning: 'border-accent-amber/30',
    };

    const trendColors = {
        up: 'text-accent-green',
        down: 'text-accent-red',
        neutral: 'text-text-muted'
    };

    return (
        <div className={`glass-card p-5 relative overflow-hidden fade-in ${variants[variant]}`}>
            {/* Background Gradient */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-accent-teal/5 to-transparent rounded-bl-full" />

            <div className="flex items-start justify-between mb-3">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">{title}</p>
                {Icon && (
                    <div className={`p-1.5 rounded-md ${variant === 'danger' ? 'bg-accent-red/10 text-accent-red' :
                            variant === 'warning' ? 'bg-accent-amber/10 text-accent-amber' :
                                'bg-accent-teal/10 text-accent-teal'
                        }`}>
                        <Icon size={16} />
                    </div>
                )}
            </div>

            <h2 className="text-2xl font-black text-text-heading mb-1">{value}</h2>

            {children}

            {(trend || trendLabel) && (
                <div className="flex items-center gap-2 mt-2">
                    {trend && (
                        <span className={`text-xs font-semibold ${trendColors[trend] || trendColors.neutral}`}>
                            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
                        </span>
                    )}
                    {trendLabel && (
                        <span className="text-[10px] text-text-muted uppercase tracking-wider">{trendLabel}</span>
                    )}
                </div>
            )}
        </div>
    );
}
