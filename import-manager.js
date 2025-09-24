/**
 * 票务导入管理模块
 * 提供智能解析航班、火车票等交通票务信息的功能
 */

class ImportManager {
    constructor() {
        // API 配置
        this.apiBase = 'https://api.travel-planner.com/v1';
        this.endpoints = {
            parse: '/import/parse',
            confirm: (importId) => `/import/${importId}/confirm`,
            history: '/import/history'
        };

        // 导入状态
        this.currentImport = null;
        this.importHistory = [];

        // 正则表达式模式
        this.patterns = {
            // 航班号匹配
            flightNumber: /([A-Z]{2}[0-9]{1,4}|[A-Z][0-9]{1,4})/g,

            // 火车车次匹配
            trainNumber: /([GCDZTYKL]\d{1,4})/g,

            // 日期时间匹配
            dateTime: /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2}[\s\T]\d{1,2}:\d{2}(?::\d{2})?)/g,
            date: /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/g,
            time: /(\d{1,2}:\d{2}(?::\d{2})?)/g,

            // 机场代码匹配
            airportCode: /\b([A-Z]{3})\b/g,

            // 座位号匹配
            seatNumber: /(\d{1,3}[A-Z]|\d{1,3}号|[A-Z]\d{1,3})/g,

            // 身份证号匹配
            idCard: /(\d{15}|\d{18})/g,

            // 手机号匹配
            phoneNumber: /(1[3-9]\d{9})/g,

            // 价格匹配
            price: /[¥￥$]\s*(\d+(?:\.\d{2})?)|(\d+(?:\.\d{2})?)\s*[元块]/g
        };

        // 航空公司映射
        this.airlines = {
            'CA': '中国国际航空',
            'CZ': '中国南方航空',
            'MU': '中国东方航空',
            'HU': '海南航空',
            'SC': '山东航空',
            'ZH': '深圳航空',
            'FM': '上海航空',
            'KN': '中国联合航空',
            'JD': '首都航空',
            'TV': '西藏航空'
        };

        // 机场代码映射（常用机场）
        this.airports = {
            'PEK': '北京首都国际机场',
            'PKX': '北京大兴国际机场',
            'PVG': '上海浦东国际机场',
            'SHA': '上海虹桥国际机场',
            'CAN': '广州白云国际机场',
            'SZX': '深圳宝安国际机场',
            'CTU': '成都双流国际机场',
            'TFU': '成都天府国际机场',
            'XIY': '西安咸阳国际机场',
            'KMG': '昆明长水国际机场',
            'HGH': '杭州萧山国际机场',
            'NKG': '南京禄口国际机场',
            'TSN': '天津滨海国际机场',
            'NRT': '成田国际机场',
            'NRT': '东京成田机场',
            'HND': '东京羽田机场',
            'ICN': '首尔仁川国际机场'
        };

        // 车站映射（常用车站）
        this.stations = {
            '北京': '北京站',
            '北京南': '北京南站',
            '北京西': '北京西站',
            '上海': '上海站',
            '上海虹桥': '上海虹桥站',
            '上海南': '上海南站',
            '广州': '广州站',
            '广州南': '广州南站',
            '深圳': '深圳站',
            '深圳北': '深圳北站'
        };

        // 事件监听器
        this.eventListeners = new Map();

        // 初始化
        this.init();
    }

    /**
     * 初始化导入管理器
     */
    init() {
        // 监听认证状态变化
        if (typeof auth !== 'undefined') {
            auth.on('authenticated', () => {
                this.loadImportHistory();
            });
        }
    }

    /**
     * 解析文本内容
     * @param {string} text - 待解析的文本
     * @param {Object} options - 解析选项
     * @returns {Promise<Object>} 解析结果
     */
    async parseText(text, options = {}) {
        try {
            // 进行本地解析
            const localResult = this.parseTextLocally(text);

            // 创建解析结果
            const parseResult = {
                id: generateId(),
                type: 'text',
                content: text,
                parsed_items: localResult.parsed_items,
                confidence: localResult.confidence,
                raw_matches: localResult.raw_matches,
                created_at: new Date().toISOString()
            };

            this.currentImport = parseResult;

            // 保存到导入历史
            localStorageService.addImportHistory({
                type: 'text',
                content: text.substring(0, 200) + '...',
                parsed_items_count: localResult.parsed_items.length,
                confidence: localResult.confidence,
                status: 'completed'
            });

            this.emit('parseSuccess', parseResult);
            return parseResult;
        } catch (error) {
            console.error('解析文本失败:', error);
            this.emit('parseError', error);
            throw error;
        }
    }

    /**
     * 确认导入
     * @param {string} importId - 导入ID
     * @param {Object} confirmData - 确认数据
     * @returns {Promise<Object>} 确认结果
     */
    async confirmImport(importId, confirmData) {
        try {
            // 模拟确认导入
            const result = {
                id: importId,
                confirmed_items: confirmData.items || [],
                success: true,
                created_trips: [],
                message: '导入成功'
            };

            // 如果有确认的项目，创建相应的行程项目
            if (confirmData.items && confirmData.items.length > 0) {
                for (const item of confirmData.items) {
                    if (confirmData.create_trip) {
                        // 创建新行程
                        const tripData = {
                            title: item.title || '导入的行程',
                            start_date: item.datetime?.date || new Date().toISOString().split('T')[0],
                            end_date: item.datetime?.date || new Date().toISOString().split('T')[0],
                            status: 'planning',
                            description: `通过${item.type === 'flight' ? '航班' : '火车'}信息导入`
                        };

                        const newTrip = localStorageService.createTrip(tripData);
                        result.created_trips.push(newTrip);

                        // 添加行程项目
                        const itemData = {
                            trip_id: newTrip.id,
                            title: item.title,
                            item_type: 'transport',
                            start_datetime: item.datetime?.datetime || new Date().toISOString(),
                            location_name: item.departure?.airport_name || item.departure?.station_name || '',
                            transportation: {
                                transport_type: item.type,
                                flight_number: item.flight_number,
                                train_number: item.train_number,
                                carrier: item.carrier
                            },
                            cost: item.price,
                            notes: `导入自: ${item.type === 'flight' ? '航班信息' : '火车信息'}`
                        };

                        localStorageService.createTripItem(itemData);
                    }
                }
            }

            this.emit('importConfirmed', result);
            return result;
        } catch (error) {
            console.error('确认导入失败:', error);
            this.emit('importError', error);
            throw error;
        }
    }

    /**
     * 获取导入历史
     * @param {Object} options - 查询选项
     * @returns {Promise<Array>} 导入历史
     */
    async loadImportHistory(options = {}) {
        try {
            const history = localStorageService.getImportHistory();
            this.importHistory = history;
            this.emit('historyLoaded', this.importHistory);
            return this.importHistory;
        } catch (error) {
            console.error('加载导入历史失败:', error);
            this.emit('historyError', error);
            throw error;
        }
    }

    /**
     * 解析图片内容
     * @param {File|string} image - 图片文件或base64字符串
     * @param {Object} options - 解析选项
     * @returns {Promise<Object>} 解析结果
     */
    async parseImage(image, options = {}) {
        try {
            let imageData;

            if (typeof image === 'string') {
                // 如果是base64字符串
                imageData = {
                    type: 'image',
                    image_base64: image,
                    options: options
                };
            } else if (image instanceof File) {
                // 如果是文件对象
                const base64 = await this.fileToBase64(image);
                imageData = {
                    type: 'image',
                    image_base64: base64,
                    file_name: image.name,
                    file_size: image.size,
                    options: options
                };
            } else {
                throw new Error('不支持的图片格式');
            }

            const response = await auth.authenticatedRequest(
                this.endpoints.parse,
                'POST',
                imageData
            );

            if (response.success) {
                this.currentImport = response.data;
                this.emit('parseSuccess', response.data);
                return response.data;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('解析图片失败:', error);
            this.emit('parseError', error);
            throw error;
        }
    }

    /**
     * 解析邮件内容
     * @param {string} emailContent - 邮件内容
     * @param {Object} options - 解析选项
     * @returns {Promise<Object>} 解析结果
     */
    async parseEmail(emailContent, options = {}) {
        try {
            // 先进行本地邮件预处理
            const processedContent = this.preprocessEmail(emailContent);
            const localResult = this.parseTextLocally(processedContent);

            const response = await auth.authenticatedRequest(
                this.endpoints.parse,
                'POST',
                {
                    type: 'email',
                    content: emailContent,
                    processed_content: processedContent,
                    local_result: localResult,
                    options: options
                }
            );

            if (response.success) {
                this.currentImport = response.data;
                this.emit('parseSuccess', response.data);
                return response.data;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('解析邮件失败:', error);
            this.emit('parseError', error);
            throw error;
        }
    }

    /**
     * 本地文本解析
     * @param {string} text - 文本内容
     * @returns {Object} 本地解析结果
     */
    parseTextLocally(text) {
        const result = {
            parsed_items: [],
            confidence: 0.5, // 本地解析置信度较低
            raw_matches: {}
        };

        // 提取各种模式
        const matches = {
            flightNumbers: this.extractMatches(text, this.patterns.flightNumber),
            trainNumbers: this.extractMatches(text, this.patterns.trainNumber),
            dateTimes: this.extractMatches(text, this.patterns.dateTime),
            dates: this.extractMatches(text, this.patterns.date),
            times: this.extractMatches(text, this.patterns.time),
            airportCodes: this.extractMatches(text, this.patterns.airportCode),
            seatNumbers: this.extractMatches(text, this.patterns.seatNumber),
            prices: this.extractPrices(text)
        };

        result.raw_matches = matches;

        // 解析航班信息
        if (matches.flightNumbers.length > 0) {
            matches.flightNumbers.forEach(flightNumber => {
                const flightInfo = this.parseFlightInfo(text, flightNumber, matches);
                if (flightInfo) {
                    result.parsed_items.push(flightInfo);
                    result.confidence = Math.max(result.confidence, 0.7);
                }
            });
        }

        // 解析火车信息
        if (matches.trainNumbers.length > 0) {
            matches.trainNumbers.forEach(trainNumber => {
                const trainInfo = this.parseTrainInfo(text, trainNumber, matches);
                if (trainInfo) {
                    result.parsed_items.push(trainInfo);
                    result.confidence = Math.max(result.confidence, 0.7);
                }
            });
        }

        return result;
    }

    /**
     * 解析航班信息
     * @param {string} text - 原始文本
     * @param {string} flightNumber - 航班号
     * @param {Object} matches - 匹配结果
     * @returns {Object|null} 航班信息
     */
    parseFlightInfo(text, flightNumber, matches) {
        const airlineCode = flightNumber.match(/[A-Z]+/)[0];
        const airlineName = this.airlines[airlineCode] || airlineCode;

        // 尝试查找出发和到达机场
        const departure = this.findDepartureArrival(text, 'departure');
        const arrival = this.findDepartureArrival(text, 'arrival');

        // 查找日期时间
        const dateTime = this.findDateTime(text, matches);

        // 查找座位信息
        const seat = matches.seatNumbers.length > 0 ? matches.seatNumbers[0] : null;

        // 查找价格
        const price = matches.prices.length > 0 ? matches.prices[0] : null;

        return {
            type: 'flight',
            title: `${departure?.city || ''}${arrival?.city ? '-' + arrival.city : ''} 航班`,
            flight_number: flightNumber,
            carrier: airlineName,
            departure: departure,
            arrival: arrival,
            datetime: dateTime,
            passenger: {
                seat: seat
            },
            price: price,
            confidence: 0.7
        };
    }

    /**
     * 解析火车信息
     * @param {string} text - 原始文本
     * @param {string} trainNumber - 车次号
     * @param {Object} matches - 匹配结果
     * @returns {Object|null} 火车信息
     */
    parseTrainInfo(text, trainNumber, matches) {
        // 确定火车类型
        const trainType = this.getTrainType(trainNumber);

        // 尝试查找出发和到达站
        const departure = this.findDepartureArrival(text, 'departure', 'train');
        const arrival = this.findDepartureArrival(text, 'arrival', 'train');

        // 查找日期时间
        const dateTime = this.findDateTime(text, matches);

        // 查找座位信息
        const seat = matches.seatNumbers.length > 0 ? matches.seatNumbers[0] : null;

        // 查找价格
        const price = matches.prices.length > 0 ? matches.prices[0] : null;

        return {
            type: 'train',
            title: `${departure?.station || ''}${arrival?.station ? '-' + arrival.station : ''} ${trainType}`,
            train_number: trainNumber,
            train_type: trainType,
            departure: departure,
            arrival: arrival,
            datetime: dateTime,
            passenger: {
                seat: seat
            },
            price: price,
            confidence: 0.7
        };
    }

    /**
     * 查找出发/到达信息
     * @param {string} text - 文本内容
     * @param {string} type - 类型：departure 或 arrival
     * @param {string} mode - 交通方式：flight 或 train
     * @returns {Object|null} 出发/到达信息
     */
    findDepartureArrival(text, type, mode = 'flight') {
        const keywords = {
            departure: ['出发', '起飞', '始发', 'FROM', 'DEP'],
            arrival: ['到达', '降落', '终到', 'TO', 'ARR']
        };

        const searchKeywords = keywords[type];
        const locations = mode === 'flight' ? this.airports : this.stations;

        // 在关键词附近查找位置信息
        for (const keyword of searchKeywords) {
            const keywordIndex = text.indexOf(keyword);
            if (keywordIndex !== -1) {
                // 在关键词前后查找位置
                const searchRange = text.substring(
                    Math.max(0, keywordIndex - 50),
                    Math.min(text.length, keywordIndex + 100)
                );

                // 查找机场代码或车站名
                for (const [code, name] of Object.entries(locations)) {
                    if (searchRange.includes(code) || searchRange.includes(name)) {
                        return mode === 'flight'
                            ? { airport_code: code, airport_name: name, city: this.getCityFromAirport(code) }
                            : { station_code: code, station_name: name, city: this.getCityFromStation(code) };
                    }
                }
            }
        }

        return null;
    }

    /**
     * 查找日期时间
     * @param {string} text - 文本内容
     * @param {Object} matches - 匹配结果
     * @returns {Object|null} 日期时间信息
     */
    findDateTime(text, matches) {
        if (matches.dateTimes.length > 0) {
            return {
                datetime: this.normalizeDateTime(matches.dateTimes[0])
            };
        }

        if (matches.dates.length > 0 && matches.times.length > 0) {
            return {
                datetime: this.normalizeDateTime(`${matches.dates[0]} ${matches.times[0]}`)
            };
        }

        if (matches.dates.length > 0) {
            return {
                date: this.normalizeDate(matches.dates[0])
            };
        }

        return null;
    }

    /**
     * 提取正则匹配
     * @param {string} text - 文本内容
     * @param {RegExp} pattern - 正则表达式
     * @returns {Array} 匹配结果
     */
    extractMatches(text, pattern) {
        const matches = [];
        let match;
        while ((match = pattern.exec(text)) !== null) {
            matches.push(match[1] || match[0]);
        }
        pattern.lastIndex = 0; // 重置正则表达式
        return [...new Set(matches)]; // 去重
    }

    /**
     * 提取价格信息
     * @param {string} text - 文本内容
     * @returns {Array} 价格列表
     */
    extractPrices(text) {
        const prices = [];
        let match;
        const pattern = this.patterns.price;

        while ((match = pattern.exec(text)) !== null) {
            const price = parseFloat(match[1] || match[2]);
            if (!isNaN(price)) {
                prices.push(price);
            }
        }

        pattern.lastIndex = 0;
        return prices;
    }

    /**
     * 获取火车类型
     * @param {string} trainNumber - 车次号
     * @returns {string} 火车类型
     */
    getTrainType(trainNumber) {
        const firstChar = trainNumber.charAt(0);
        const typeMap = {
            'G': '高速动车组',
            'C': '城际动车组',
            'D': '动车组',
            'Z': '直达特快',
            'T': '特快',
            'Y': '临时旅客列车',
            'K': '快速',
            'L': '临时'
        };
        return typeMap[firstChar] || '普通列车';
    }

    /**
     * 从机场代码获取城市
     * @param {string} airportCode - 机场代码
     * @returns {string} 城市名称
     */
    getCityFromAirport(airportCode) {
        const cityMap = {
            'PEK': '北京', 'PKX': '北京',
            'PVG': '上海', 'SHA': '上海',
            'CAN': '广州', 'SZX': '深圳',
            'CTU': '成都', 'TFU': '成都',
            'XIY': '西安', 'KMG': '昆明',
            'HGH': '杭州', 'NKG': '南京',
            'TSN': '天津',
            'NRT': '东京', 'HND': '东京',
            'ICN': '首尔'
        };
        return cityMap[airportCode] || '';
    }

    /**
     * 从车站代码获取城市
     * @param {string} stationCode - 车站代码
     * @returns {string} 城市名称
     */
    getCityFromStation(stationCode) {
        if (stationCode.includes('北京')) return '北京';
        if (stationCode.includes('上海')) return '上海';
        if (stationCode.includes('广州')) return '广州';
        if (stationCode.includes('深圳')) return '深圳';
        return stationCode.replace(/[站南北西东]/g, '');
    }

    /**
     * 预处理邮件内容
     * @param {string} emailContent - 邮件内容
     * @returns {string} 处理后的内容
     */
    preprocessEmail(emailContent) {
        // 移除HTML标签
        let processed = emailContent.replace(/<[^>]*>/g, ' ');

        // 移除多余的空白字符
        processed = processed.replace(/\s+/g, ' ').trim();

        // 移除常见的邮件头部和尾部信息
        const removePatterns = [
            /发件人:.*?\n/gi,
            /收件人:.*?\n/gi,
            /主题:.*?\n/gi,
            /此邮件为系统自动发送.*$/gi,
            /如有疑问.*$/gi
        ];

        removePatterns.forEach(pattern => {
            processed = processed.replace(pattern, '');
        });

        return processed;
    }

    /**
     * 标准化日期时间
     * @param {string} dateTimeStr - 日期时间字符串
     * @returns {string} 标准化后的日期时间
     */
    normalizeDateTime(dateTimeStr) {
        try {
            const date = new Date(dateTimeStr.replace(/[\/]/g, '-'));
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
        } catch (error) {
            console.warn('日期时间标准化失败:', error);
        }
        return dateTimeStr;
    }

    /**
     * 标准化日期
     * @param {string} dateStr - 日期字符串
     * @returns {string} 标准化后的日期
     */
    normalizeDate(dateStr) {
        try {
            const date = new Date(dateStr.replace(/[\/]/g, '-'));
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
        } catch (error) {
            console.warn('日期标准化失败:', error);
        }
        return dateStr;
    }

    /**
     * 文件转Base64
     * @param {File} file - 文件对象
     * @returns {Promise<string>} Base64字符串
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * 确认导入
     * @param {string} importId - 导入ID
     * @param {Object} confirmData - 确认数据
     * @returns {Promise<Object>} 确认结果
     */
    async confirmImport(importId, confirmData) {
        try {
            const response = await auth.authenticatedRequest(
                this.endpoints.confirm(importId),
                'POST',
                confirmData
            );

            if (response.success) {
                this.emit('importConfirmed', response.data);
                return response.data;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('确认导入失败:', error);
            this.emit('importError', error);
            throw error;
        }
    }

    /**
     * 获取导入历史
     * @param {Object} options - 查询选项
     * @returns {Promise<Array>} 导入历史
     */
    async loadImportHistory(options = {}) {
        try {
            const params = new URLSearchParams(options);
            const response = await auth.authenticatedRequest(
                `${this.endpoints.history}?${params.toString()}`,
                'GET'
            );

            if (response.success) {
                this.importHistory = response.data.imports || [];
                this.emit('historyLoaded', this.importHistory);
                return this.importHistory;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('加载导入历史失败:', error);
            this.emit('historyError', error);
            throw error;
        }
    }

    /**
     * 验证解析结果
     * @param {Object} parseResult - 解析结果
     * @returns {Object} 验证结果
     */
    validateParseResult(parseResult) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: []
        };

        if (!parseResult || !parseResult.parsed_items) {
            validation.isValid = false;
            validation.errors.push('解析结果为空');
            return validation;
        }

        parseResult.parsed_items.forEach((item, index) => {
            // 验证必要字段
            if (!item.type) {
                validation.errors.push(`项目${index + 1}缺少类型信息`);
                validation.isValid = false;
            }

            if (!item.title) {
                validation.warnings.push(`项目${index + 1}建议添加标题`);
            }

            // 验证航班信息
            if (item.type === 'flight') {
                if (!item.flight_number) {
                    validation.errors.push(`航班项目${index + 1}缺少航班号`);
                    validation.isValid = false;
                }

                if (!item.departure && !item.arrival) {
                    validation.warnings.push(`航班项目${index + 1}缺少出发或到达信息`);
                }
            }

            // 验证火车信息
            if (item.type === 'train') {
                if (!item.train_number) {
                    validation.errors.push(`火车项目${index + 1}缺少车次号`);
                    validation.isValid = false;
                }
            }

            // 验证置信度
            if (item.confidence < 0.5) {
                validation.warnings.push(`项目${index + 1}的解析置信度较低，请核对信息`);
            }
        });

        return validation;
    }

    /**
     * 事件监听
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event).add(callback);
    }

    /**
     * 移除事件监听
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).delete(callback);
        }
    }

    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {*} data - 事件数据
     */
    emit(event, data = null) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`导入事件回调执行失败 (${event}):`, error);
                }
            });
        }
    }

    /**
     * 销毁导入管理器
     */
    destroy() {
        this.currentImport = null;
        this.importHistory = [];
        this.eventListeners.clear();
    }
}

// 创建全局导入管理器实例
const importManager = new ImportManager();

// 导出导入管理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImportManager;
}