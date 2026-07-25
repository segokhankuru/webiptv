// Remote logger utility to capture mobile browser console & runtime errors and send them to the server terminal.

export function initRemoteLogger() {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    function sendLog(level, args, stack = null) {
        try {
            const formattedArgs = args.map(arg => {
                if (arg instanceof Error) {
                    return `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
                }
                if (typeof arg === 'object') {
                    try { return JSON.stringify(arg); } catch (e) { return String(arg); }
                }
                return String(arg);
            });

            fetch('/api/remote-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    level,
                    args: formattedArgs,
                    stack,
                    url: window.location.href,
                    ua: navigator.userAgent
                })
            }).catch(() => {}); // Fail silently if network fails
        } catch (e) {
            // Ignore logger errors
        }
    }

    console.log = function (...args) {
        originalLog.apply(console, args);
        sendLog('info', args);
    };

    console.warn = function (...args) {
        originalWarn.apply(console, args);
        sendLog('warn', args);
    };

    console.error = function (...args) {
        originalError.apply(console, args);
        sendLog('error', args);
    };

    console.info = function (...args) {
        originalInfo.apply(console, args);
        sendLog('info', args);
    };

    // Catch uncaught errors (e.g. syntax errors, undefined variable reference)
    window.addEventListener('error', (event) => {
        sendLog('error', [`Uncaught Error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`], event.error?.stack);
    });

    // Catch unhandled promise rejections (e.g. failed fetch, async error)
    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        const msg = reason?.message || String(reason);
        sendLog('error', [`Unhandled Promise Rejection: ${msg}`], reason?.stack);
    });

    console.log("📱 Mobile Remote Logger initialized.");
}
