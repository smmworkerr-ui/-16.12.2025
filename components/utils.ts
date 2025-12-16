

export const formatDate = (ts: number) => {
    if (!ts || isNaN(ts)) return '';
    // VK возвращает секунды, JS требует мс. Если число маленькое (< 10 млрд), значит секунды
    const date = new Date(ts * (ts < 10000000000 ? 1000 : 1));
    return date.toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
};

/**
 * Counts the total possible variations of a spintax string.
 * Supports {A|B} and {A/B} formats.
 */
export const countSpintaxVariations = (text: string): number => {
    if (!text) return 1;

    // We will build a recursive counter
    const processGroup = (str: string): number => {
        // Find top level groups
        let result = 1;
        let i = 0;
        
        while (i < str.length) {
            if (str[i] === '{') {
                // Find closing
                let balance = 1;
                let j = i + 1;
                while (j < str.length && balance > 0) {
                    if (str[j] === '{') balance++;
                    if (str[j] === '}') balance--;
                    j++;
                }
                
                if (balance === 0) {
                    // Found a full group: str[i...j-1] -> "{...}"
                    const content = str.substring(i + 1, j - 1);
                    // Split content by | or / BUT respect nested braces
                    const parts = splitBySeparator(content);
                    let groupVariations = 0;
                    parts.forEach(p => {
                        groupVariations += processGroup(p);
                    });
                    
                    if (groupVariations === 0) groupVariations = 1; // Empty option counts as 1
                    result *= groupVariations;
                    i = j;
                    continue;
                }
            }
            i++;
        }
        return result;
    };

    const splitBySeparator = (str: string): string[] => {
        const parts = [];
        let balance = 0;
        let lastSplit = 0;
        for (let i = 0; i < str.length; i++) {
            if (str[i] === '{') balance++;
            if (str[i] === '}') balance--;
            // Support both | and / as separators at level 0
            if ((str[i] === '|' || str[i] === '/') && balance === 0) {
                parts.push(str.substring(lastSplit, i));
                lastSplit = i + 1;
            }
        }
        parts.push(str.substring(lastSplit));
        return parts;
    };

    // Optimization: If no brackets, return 1
    if (!text.includes('{')) return 1;

    try {
        return processGroup(text);
    } catch (e) {
        console.error("Spintax calc error:", e);
        return 1;
    }
};

/**
 * Analyzes spintax structure for visualization.
 * Returns an array of blocks: string (static) or object (variable group).
 */
export const analyzeSpintax = (text: string): { type: 'static' | 'group', content: string | any[], count: number, raw?: string }[] => {
    const blocks: any[] = [];
    if (!text) return blocks;

    let i = 0;
    let lastIndex = 0;

    while (i < text.length) {
        if (text[i] === '{') {
            // Push preceding static text
            if (i > lastIndex) {
                blocks.push({ type: 'static', content: text.substring(lastIndex, i), count: 1 });
            }

            // Find closing
            let balance = 1;
            let j = i + 1;
            while (j < text.length && balance > 0) {
                if (text[j] === '{') balance++;
                if (text[j] === '}') balance--;
                j++;
            }

            if (balance === 0) {
                // Found group
                const rawGroup = text.substring(i, j); // {A|B}
                const inner = text.substring(i + 1, j - 1); // A|B
                const variations = countSpintaxVariations(rawGroup);
                
                // Simple split for visualizer (not recursive for visual simplicity, just top level)
                const options = [];
                let optBalance = 0;
                let optLast = 0;
                for(let k=0; k<inner.length; k++) {
                    if(inner[k] === '{') optBalance++;
                    if(inner[k] === '}') optBalance--;
                    if((inner[k] === '|' || inner[k] === '/') && optBalance === 0) {
                        options.push(inner.substring(optLast, k));
                        optLast = k+1;
                    }
                }
                options.push(inner.substring(optLast));

                blocks.push({ type: 'group', content: options, count: variations, raw: rawGroup });
                lastIndex = j;
                i = j;
                continue;
            }
        }
        i++;
    }

    if (lastIndex < text.length) {
        blocks.push({ type: 'static', content: text.substring(lastIndex), count: 1 });
    }

    return blocks;
};

/**
 * Generates one random variation of the spintax string (Client-side preview).
 * Supports {A|B} and {A/B}.
 */
export const processSpintax = (text: string): string => {
    if (!text) return "";
    
    // Find pattern { ... } that contains no other { } inside (innermost)
    const pattern = /\{([^{}]+)\}/;
    let currentText = text;
    let iterations = 0;
    const maxIterations = 100; // Safety break

    while (iterations < maxIterations) {
        const match = currentText.match(pattern);
        if (!match) break;

        const fullMatch = match[0]; // {A|B}
        const content = match[1];   // A|B
        // Split by | or /
        const options = content.split(/\||\//);
        const choice = options[Math.floor(Math.random() * options.length)];

        currentText = currentText.replace(fullMatch, choice);
        iterations++;
    }
    
    return currentText;
};

export interface RiskBreakdown {
    totalRisk: number;
    loadPenalty: number;
    speedPenalty: number;
    contentPenalty: number;
    bonus: number;
}

/**
 * Расширенный алгоритм расчета здоровья аккаунта (v2.0)
 * 
 * @param msgCountNew Кол-во сообщений на один аккаунт (планируемое)
 * @param avgDelay Средняя задержка (сек)
 * @param spintaxScore Кол-во вариантов текста
 * @param limit Лимит аккаунта (по умолчанию 20, 0 = Unlimited)
 * @param usedToday Сколько уже отправлено за последние 24ч
 * @param lastActivityTime Timestamp последней активности (сек)
 * @returns RiskBreakdown Объект с детализацией штрафов
 */
export const calculateDetailedRisk = (
    msgCountNew: number, 
    avgDelay: number, 
    spintaxScore: number, 
    limit: number = 20, 
    usedToday: number = 0,
    lastActivityTime?: number
): RiskBreakdown => {
    
    // --- ADAPTIVE DECAY LOGIC ---
    let effectiveUsed = usedToday;
    
    if (lastActivityTime && usedToday > 0) {
        const nowSec = Math.floor(Date.now() / 1000);
        const diffHours = (nowSec - lastActivityTime) / 3600;
        
        if (diffHours < 24) {
            const decayFactor = Math.max(0, 1 - (diffHours / 24));
            effectiveUsed = usedToday * decayFactor;
        } else {
            effectiveUsed = 0; 
        }
    }

    const totalProjectedLoad = effectiveUsed + msgCountNew;

    // 1. ШТРАФ ЗА НАГРУЗКУ (Экспоненциальный)
    // Если лимит 0, считаем что нагрузки "по лимиту" нет
    let loadPenalty = 0;
    if (limit > 0) {
        const loadRatio = totalProjectedLoad / limit;
        if (loadRatio > 1.2) {
            loadPenalty = 100; // Смертельная перегрузка
        } else {
            loadPenalty = Math.pow(loadRatio, 2) * 80;
        }
    }

    // 2. ШТРАФ ЗА СКОРОСТЬ (Линейный с порогом)
    let speedPenalty = 0;
    const SAFE_DELAY = 60;
    if (avgDelay < SAFE_DELAY) {
        speedPenalty = (SAFE_DELAY - avgDelay) * 0.8;
    }
    // Критический штраф за бот-скорость
    if (avgDelay < 10) speedPenalty += 30;

    // 3. ШТРАФ ЗА КОНТЕНТ (Обратная пропорция)
    let contentPenalty = 0;
    if (spintaxScore > 0) {
        contentPenalty = 20 / spintaxScore;
    } else {
        contentPenalty = 20; // 0 вариантов (пусто)
    }

    // 4. БОНУС ЗА МИКРО-ПАРТИИ
    let bonusFactor = 1.0;
    // Считаем только новую партию для бонуса
    if (msgCountNew <= 3) bonusFactor = 0.4;      
    else if (msgCountNew <= 7) bonusFactor = 0.7; 
    else if (msgCountNew <= 15) bonusFactor = 0.9;
    else if (msgCountNew > 40) bonusFactor = 1.3; 

    // Применяем бонус к сумме штрафов
    const rawRisk = (loadPenalty + speedPenalty + contentPenalty) * bonusFactor;
    
    // Итоговый риск (0 - 100)
    const totalRisk = Math.min(100, Math.floor(rawRisk));

    return {
        totalRisk,
        loadPenalty: Math.floor(loadPenalty * bonusFactor),
        speedPenalty: Math.floor(speedPenalty * bonusFactor),
        contentPenalty: Math.floor(contentPenalty * bonusFactor),
        bonus: bonusFactor
    };
};

/**
 * Legacy wrapper
 */
export const calculateRisk = (msgCount: number, avgDelay: number, spintaxScore: number, limit: number = 20, usedToday: number = 0, lastActivityTime?: number): number => {
    return calculateDetailedRisk(msgCount, avgDelay, spintaxScore, limit, usedToday, lastActivityTime).totalRisk;
};