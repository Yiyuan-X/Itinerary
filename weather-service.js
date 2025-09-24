/**
 * 天气服务管理模块
 * 提供天气查询、预报和提醒功能
 */

class WeatherService {
    constructor() {
        // API 配置
        this.apiBase = 'https://api.travel-planner.com/v1';
        this.endpoints = {
            current: '/weather/current',
            forecast: '/weather/forecast',
            historical: '/weather/historical',
            alerts: '/weather/alerts'
        };

        // 天气数据缓存
        this.cache = new Map();
        this.cacheTimeout = 30 * 60 * 1000; // 30分钟缓存

        // 天气图标映射
        this.weatherIcons = {
            sunny: '☀️',
            cloudy: '☁️',
            partly_cloudy: '⛅',
            overcast: '☁️',
            light_rain: '🌦️',
            moderate_rain: '🌧️',
            heavy_rain: '⛈️',
            thunderstorm: '⛈️',
            light_snow: '🌨️',
            moderate_snow: '❄️',
            heavy_snow: '❄️',
            fog: '🌫️',
            haze: '😶‍🌫️',
            sandstorm: '🌪️',
            default: '🌤️'
        };

        // 天气状态映射
        this.weatherStatus = {
            sunny: '晴天',
            cloudy: '多云',
            partly_cloudy: '少云',
            overcast: '阴天',
            light_rain: '小雨',
            moderate_rain: '中雨',
            heavy_rain: '大雨',
            thunderstorm: '雷阵雨',
            light_snow: '小雪',
            moderate_snow: '中雪',
            heavy_snow: '大雪',
            fog: '雾',
            haze: '霾',
            sandstorm: '沙尘暴'
        };

        // 事件监听器
        this.eventListeners = new Map();

        // 初始化
        this.init();
    }

    /**
     * 初始化天气服务
     */
    init() {
        // 监听认证状态变化
        if (typeof auth !== 'undefined') {
            auth.on('authenticated', () => {
                console.log('天气服务已准备就绪');
                this.emit('ready');
            });
        }

        // 定期清理缓存
        this.cleanupInterval = setInterval(() => {
            this.cleanupCache();
        }, 10 * 60 * 1000); // 每10分钟清理一次
    }

    /**
     * 获取当前天气
     * @param {string|Object} location - 位置信息（地名或经纬度）
     * @param {string} date - 日期（可选，默认当前日期）
     * @returns {Promise<Object>} 当前天气信息
     */
    async getCurrentWeather(location, date = null) {
        try {
            // 生成缓存键
            const cacheKey = `current_${this.locationToString(location)}_${date || 'now'}`;

            // 检查缓存
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }

            // 使用高德地图天气API (模拟数据，实际需要调用相应MCP工具)
            let cityName = '';
            if (typeof location === 'string') {
                cityName = location;
            } else if (location.latitude && location.longitude) {
                cityName = '当前位置'; // 实际应用中应该通过逆地理编码获取城市名
            }

            // 模拟天气数据
            const mockWeatherData = {
                location: {
                    name: cityName,
                    coordinates: location
                },
                current: {
                    temperature: Math.floor(Math.random() * 30) + 5, // 5-35度
                    feels_like: Math.floor(Math.random() * 30) + 5,
                    humidity: Math.floor(Math.random() * 100),
                    weather: this.getRandomWeather(),
                    weather_code: this.getRandomWeatherCode(),
                    wind_speed: Math.floor(Math.random() * 20),
                    wind_direction: Math.floor(Math.random() * 360),
                    visibility: Math.floor(Math.random() * 20) + 5,
                    uv_index: Math.floor(Math.random() * 10),
                    pressure: Math.floor(Math.random() * 100) + 1000,
                    updated_at: new Date().toISOString()
                },
                timestamp: new Date().toISOString()
            };

            // 添加天气图标
            mockWeatherData.current.weather_icon = this.getWeatherIcon(mockWeatherData.current.weather_code);

            // 存入缓存
            this.setCache(cacheKey, mockWeatherData);

            this.emit('weatherLoaded', mockWeatherData);
            return mockWeatherData;
        } catch (error) {
            console.error('获取当前天气失败:', error);
            this.emit('weatherError', error);
            throw error;
        }
    }

    /**
     * 获取随机天气状态
     * @returns {string} 天气状态
     */
    getRandomWeather() {
        const weathers = ['晴天', '多云', '阴天', '小雨', '中雨', '雷阵雨', '雾'];
        return weathers[Math.floor(Math.random() * weathers.length)];
    }

    /**
     * 获取随机天气代码
     * @returns {string} 天气代码
     */
    getRandomWeatherCode() {
        const codes = ['sunny', 'cloudy', 'overcast', 'light_rain', 'moderate_rain', 'thunderstorm', 'fog'];
        return codes[Math.floor(Math.random() * codes.length)];
    }

    /**
     * 获取天气预报
     * @param {string|Object} location - 位置信息
     * @param {number} days - 预报天数（1-15天）
     * @returns {Promise<Object>} 天气预报信息
     */
    async getWeatherForecast(location, days = 7) {
        try {
            // 验证参数
            if (days < 1 || days > 15) {
                throw new Error('预报天数必须在1-15天之间');
            }

            // 生成缓存键
            const cacheKey = `forecast_${this.locationToString(location)}_${days}`;

            // 检查缓存
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }

            // 构建请求参数
            const params = new URLSearchParams();
            if (typeof location === 'string') {
                params.set('location', location);
            } else if (location.latitude && location.longitude) {
                params.set('lat', location.latitude.toString());
                params.set('lng', location.longitude.toString());
            } else {
                throw new Error('位置信息格式不正确');
            }

            params.set('days', days.toString());

            // 发送请求
            const response = await auth.authenticatedRequest(
                `${this.endpoints.forecast}?${params.toString()}`,
                'GET'
            );

            if (response.success) {
                const forecastData = this.processForecastData(response.data);

                // 存入缓存
                this.setCache(cacheKey, forecastData);

                this.emit('forecastLoaded', forecastData);
                return forecastData;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('获取天气预报失败:', error);
            this.emit('forecastError', error);
            throw error;
        }
    }

    /**
     * 获取历史天气
     * @param {string|Object} location - 位置信息
     * @param {string} startDate - 开始日期 (YYYY-MM-DD)
     * @param {string} endDate - 结束日期 (YYYY-MM-DD)
     * @returns {Promise<Object>} 历史天气信息
     */
    async getHistoricalWeather(location, startDate, endDate) {
        try {
            // 验证日期
            if (!this.isValidDate(startDate) || !this.isValidDate(endDate)) {
                throw new Error('日期格式不正确，请使用 YYYY-MM-DD 格式');
            }

            if (new Date(startDate) > new Date(endDate)) {
                throw new Error('开始日期不能晚于结束日期');
            }

            // 生成缓存键
            const cacheKey = `historical_${this.locationToString(location)}_${startDate}_${endDate}`;

            // 检查缓存
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }

            // 构建请求参数
            const params = new URLSearchParams();
            if (typeof location === 'string') {
                params.set('location', location);
            } else if (location.latitude && location.longitude) {
                params.set('lat', location.latitude.toString());
                params.set('lng', location.longitude.toString());
            } else {
                throw new Error('位置信息格式不正确');
            }

            params.set('start_date', startDate);
            params.set('end_date', endDate);

            // 发送请求
            const response = await auth.authenticatedRequest(
                `${this.endpoints.historical}?${params.toString()}`,
                'GET'
            );

            if (response.success) {
                const historicalData = this.processHistoricalData(response.data);

                // 存入缓存（历史数据缓存更长时间）
                this.setCache(cacheKey, historicalData, 24 * 60 * 60 * 1000); // 24小时

                this.emit('historicalLoaded', historicalData);
                return historicalData;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('获取历史天气失败:', error);
            this.emit('historicalError', error);
            throw error;
        }
    }

    /**
     * 获取天气预警
     * @param {string|Object} location - 位置信息
     * @returns {Promise<Array>} 天气预警列表
     */
    async getWeatherAlerts(location) {
        try {
            // 构建请求参数
            const params = new URLSearchParams();
            if (typeof location === 'string') {
                params.set('location', location);
            } else if (location.latitude && location.longitude) {
                params.set('lat', location.latitude.toString());
                params.set('lng', location.longitude.toString());
            } else {
                throw new Error('位置信息格式不正确');
            }

            // 发送请求
            const response = await auth.authenticatedRequest(
                `${this.endpoints.alerts}?${params.toString()}`,
                'GET'
            );

            if (response.success) {
                const alerts = response.data.alerts || [];
                this.emit('alertsLoaded', alerts);
                return alerts;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('获取天气预警失败:', error);
            this.emit('alertsError', error);
            throw error;
        }
    }

    /**
     * 批量获取多地天气
     * @param {Array} locations - 位置列表
     * @param {number} days - 预报天数
     * @returns {Promise<Object>} 多地天气信息
     */
    async getBatchWeather(locations, days = 1) {
        try {
            const weatherPromises = locations.map(async location => {
                try {
                    const current = await this.getCurrentWeather(location);
                    const forecast = days > 1 ? await this.getWeatherForecast(location, days) : null;

                    return {
                        location: location,
                        current: current,
                        forecast: forecast,
                        error: null
                    };
                } catch (error) {
                    return {
                        location: location,
                        current: null,
                        forecast: null,
                        error: error.message
                    };
                }
            });

            const results = await Promise.all(weatherPromises);
            const batchData = {
                locations: results,
                timestamp: new Date().toISOString()
            };

            this.emit('batchWeatherLoaded', batchData);
            return batchData;
        } catch (error) {
            console.error('批量获取天气失败:', error);
            this.emit('batchWeatherError', error);
            throw error;
        }
    }

    /**
     * 为行程获取天气信息
     * @param {Object} trip - 行程对象
     * @returns {Promise<Object>} 行程天气信息
     */
    async getTripWeather(trip) {
        try {
            if (!trip || !trip.items || trip.items.length === 0) {
                throw new Error('行程信息不完整');
            }

            const tripWeather = {
                trip_id: trip.id,
                trip_title: trip.title,
                weather_data: [],
                summary: {
                    sunny_days: 0,
                    rainy_days: 0,
                    average_temperature: 0,
                    alerts: []
                }
            };

            // 获取行程中有位置信息的项目
            const locationsWithDates = trip.items
                .filter(item => item.location_coordinates && item.start_datetime)
                .map(item => ({
                    location: item.location_coordinates,
                    location_name: item.location_name,
                    date: item.start_datetime.split('T')[0],
                    item_id: item.id,
                    item_title: item.title
                }));

            // 按日期分组，避免重复查询
            const uniqueLocationDates = new Map();
            locationsWithDates.forEach(item => {
                const key = `${item.location.latitude}_${item.location.longitude}_${item.date}`;
                if (!uniqueLocationDates.has(key)) {
                    uniqueLocationDates.set(key, item);
                }
            });

            // 批量获取天气信息
            for (const [key, locationDate] of uniqueLocationDates) {
                try {
                    const weather = await this.getCurrentWeather(locationDate.location, locationDate.date);

                    tripWeather.weather_data.push({
                        location: locationDate.location,
                        location_name: locationDate.location_name,
                        date: locationDate.date,
                        weather: weather,
                        items: locationsWithDates.filter(item =>
                            item.location.latitude === locationDate.location.latitude &&
                            item.location.longitude === locationDate.location.longitude &&
                            item.date === locationDate.date
                        )
                    });

                    // 统计天气情况
                    if (weather.current.weather_code.includes('sunny')) {
                        tripWeather.summary.sunny_days++;
                    } else if (weather.current.weather_code.includes('rain')) {
                        tripWeather.summary.rainy_days++;
                    }

                    // 获取预警信息
                    try {
                        const alerts = await this.getWeatherAlerts(locationDate.location);
                        tripWeather.summary.alerts.push(...alerts);
                    } catch (alertError) {
                        console.warn('获取预警信息失败:', alertError);
                    }

                } catch (weatherError) {
                    console.warn(`获取 ${locationDate.location_name} 天气失败:`, weatherError);

                    tripWeather.weather_data.push({
                        location: locationDate.location,
                        location_name: locationDate.location_name,
                        date: locationDate.date,
                        weather: null,
                        error: weatherError.message,
                        items: locationsWithDates.filter(item =>
                            item.location.latitude === locationDate.location.latitude &&
                            item.location.longitude === locationDate.location.longitude &&
                            item.date === locationDate.date
                        )
                    });
                }
            }

            // 计算平均温度
            const validWeatherData = tripWeather.weather_data.filter(data => data.weather);
            if (validWeatherData.length > 0) {
                const totalTemp = validWeatherData.reduce((sum, data) =>
                    sum + data.weather.current.temperature, 0);
                tripWeather.summary.average_temperature = Math.round(totalTemp / validWeatherData.length);
            }

            this.emit('tripWeatherLoaded', tripWeather);
            return tripWeather;
        } catch (error) {
            console.error('获取行程天气失败:', error);
            this.emit('tripWeatherError', error);
            throw error;
        }
    }

    /**
     * 检查天气是否适合出行
     * @param {Object} weather - 天气数据
     * @param {string} activityType - 活动类型
     * @returns {Object} 适宜性评估
     */
    assessWeatherSuitability(weather, activityType = 'general') {
        const assessment = {
            suitable: true,
            score: 100,
            warnings: [],
            recommendations: []
        };

        if (!weather || !weather.current) {
            return {
                suitable: false,
                score: 0,
                warnings: ['天气数据不可用'],
                recommendations: ['请检查网络连接后重试']
            };
        }

        const current = weather.current;

        // 温度评估
        if (current.temperature < -10) {
            assessment.score -= 30;
            assessment.warnings.push('气温极低，请注意保暖');
            assessment.recommendations.push('准备厚重的冬季服装');
        } else if (current.temperature < 0) {
            assessment.score -= 15;
            assessment.warnings.push('气温较低，注意保暖');
            assessment.recommendations.push('穿着保暖衣物');
        } else if (current.temperature > 35) {
            assessment.score -= 20;
            assessment.warnings.push('气温较高，注意防暑');
            assessment.recommendations.push('多喝水，避免长时间暴晒');
        }

        // 天气状况评估
        const weatherCode = current.weather_code;
        if (weatherCode.includes('heavy_rain') || weatherCode.includes('thunderstorm')) {
            assessment.score -= 40;
            assessment.warnings.push('有强降雨或雷电，出行需谨慎');
            assessment.recommendations.push('考虑室内活动或延期出行');
        } else if (weatherCode.includes('rain')) {
            assessment.score -= 20;
            assessment.warnings.push('有降雨，请携带雨具');
            assessment.recommendations.push('准备雨伞或雨衣');
        } else if (weatherCode.includes('snow')) {
            assessment.score -= 25;
            assessment.warnings.push('有降雪，路面可能湿滑');
            assessment.recommendations.push('注意交通安全，穿防滑鞋');
        }

        // 风力评估
        if (current.wind_speed > 30) {
            assessment.score -= 25;
            assessment.warnings.push('风力较强，出行请注意安全');
            assessment.recommendations.push('避免高空作业或水上活动');
        }

        // 能见度评估
        if (current.visibility < 1) {
            assessment.score -= 30;
            assessment.warnings.push('能见度极低，驾驶需谨慎');
            assessment.recommendations.push('开启雾灯，降低车速');
        } else if (current.visibility < 3) {
            assessment.score -= 15;
            assessment.warnings.push('能见度较低');
            assessment.recommendations.push('注意交通安全');
        }

        // 根据活动类型调整评估
        this.adjustAssessmentForActivity(assessment, current, activityType);

        // 确定适宜性
        assessment.suitable = assessment.score >= 60;

        return assessment;
    }

    /**
     * 根据活动类型调整评估
     * @param {Object} assessment - 评估对象
     * @param {Object} current - 当前天气
     * @param {string} activityType - 活动类型
     */
    adjustAssessmentForActivity(assessment, current, activityType) {
        switch (activityType) {
            case 'outdoor_sports':
                if (current.weather_code.includes('rain')) {
                    assessment.score -= 30;
                    assessment.warnings.push('降雨不适合户外运动');
                }
                if (current.temperature > 30 || current.temperature < 5) {
                    assessment.score -= 20;
                    assessment.warnings.push('温度不适宜户外运动');
                }
                break;

            case 'sightseeing':
                if (current.weather_code.includes('fog') || current.visibility < 5) {
                    assessment.score -= 25;
                    assessment.warnings.push('雾霾可能影响观景效果');
                }
                break;

            case 'beach':
                if (current.temperature < 20) {
                    assessment.score -= 30;
                    assessment.warnings.push('温度偏低，不适合海滩活动');
                }
                if (current.weather_code.includes('rain')) {
                    assessment.score -= 40;
                    assessment.warnings.push('降雨不适合海滩活动');
                }
                break;

            case 'driving':
                if (current.visibility < 3 || current.weather_code.includes('heavy')) {
                    assessment.score -= 35;
                    assessment.warnings.push('天气条件不利于驾驶');
                }
                break;
        }
    }

    /**
     * 处理天气数据
     * @param {Object} data - 原始天气数据
     * @returns {Object} 处理后的天气数据
     */
    processWeatherData(data) {
        return {
            location: data.location,
            current: {
                temperature: data.current.temperature,
                feels_like: data.current.feels_like,
                humidity: data.current.humidity,
                weather: data.current.weather,
                weather_code: data.current.weather_code,
                weather_icon: this.getWeatherIcon(data.current.weather_code),
                wind_speed: data.current.wind_speed,
                wind_direction: data.current.wind_direction,
                visibility: data.current.visibility,
                uv_index: data.current.uv_index,
                pressure: data.current.pressure,
                updated_at: data.current.updated_at
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 处理预报数据
     * @param {Object} data - 原始预报数据
     * @returns {Object} 处理后的预报数据
     */
    processForecastData(data) {
        return {
            location: data.location,
            current: this.processWeatherData({ location: data.location, current: data.current }).current,
            forecast: data.forecast.map(day => ({
                date: day.date,
                temperature_max: day.temperature_max,
                temperature_min: day.temperature_min,
                weather: day.weather,
                weather_code: day.weather_code,
                weather_icon: this.getWeatherIcon(day.weather_code),
                precipitation_probability: day.precipitation_probability,
                precipitation_amount: day.precipitation_amount,
                wind_speed: day.wind_speed,
                wind_direction: day.wind_direction,
                uv_index: day.uv_index
            })),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 处理历史天气数据
     * @param {Object} data - 原始历史数据
     * @returns {Object} 处理后的历史数据
     */
    processHistoricalData(data) {
        return {
            location: data.location,
            period: {
                start_date: data.period.start_date,
                end_date: data.period.end_date
            },
            daily_data: data.daily_data.map(day => ({
                date: day.date,
                temperature_max: day.temperature_max,
                temperature_min: day.temperature_min,
                temperature_avg: day.temperature_avg,
                weather: day.weather,
                weather_code: day.weather_code,
                weather_icon: this.getWeatherIcon(day.weather_code),
                precipitation: day.precipitation,
                wind_speed: day.wind_speed,
                humidity: day.humidity
            })),
            summary: {
                avg_temperature: data.summary.avg_temperature,
                max_temperature: data.summary.max_temperature,
                min_temperature: data.summary.min_temperature,
                total_precipitation: data.summary.total_precipitation,
                sunny_days: data.summary.sunny_days,
                rainy_days: data.summary.rainy_days
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 获取天气图标
     * @param {string} weatherCode - 天气代码
     * @returns {string} 天气图标
     */
    getWeatherIcon(weatherCode) {
        return this.weatherIcons[weatherCode] || this.weatherIcons.default;
    }

    /**
     * 获取天气状态文本
     * @param {string} weatherCode - 天气代码
     * @returns {string} 天气状态文本
     */
    getWeatherStatus(weatherCode) {
        return this.weatherStatus[weatherCode] || weatherCode;
    }

    /**
     * 位置信息转字符串
     * @param {string|Object} location - 位置信息
     * @returns {string} 位置字符串
     */
    locationToString(location) {
        if (typeof location === 'string') {
            return location;
        } else if (location.latitude && location.longitude) {
            return `${location.latitude},${location.longitude}`;
        }
        return 'unknown';
    }

    /**
     * 验证日期格式
     * @param {string} dateStr - 日期字符串
     * @returns {boolean} 是否有效
     */
    isValidDate(dateStr) {
        const date = new Date(dateStr);
        return date instanceof Date && !isNaN(date) && dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
    }

    /**
     * 从缓存获取数据
     * @param {string} key - 缓存键
     * @returns {*} 缓存数据或null
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
            return cached.data;
        }
        return null;
    }

    /**
     * 设置缓存数据
     * @param {string} key - 缓存键
     * @param {*} data - 缓存数据
     * @param {number} ttl - 过期时间（毫秒）
     */
    setCache(key, data, ttl = this.cacheTimeout) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now(),
            ttl: ttl
        });
    }

    /**
     * 清理过期缓存
     */
    cleanupCache() {
        const now = Date.now();
        for (const [key, cached] of this.cache) {
            if (now - cached.timestamp >= cached.ttl) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * 清除所有缓存
     */
    clearCache() {
        this.cache.clear();
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
                    console.error(`天气事件回调执行失败 (${event}):`, error);
                }
            });
        }
    }

    /**
     * 销毁天气服务
     */
    destroy() {
        this.clearCache();
        this.eventListeners.clear();

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
}

// 创建全局天气服务实例
const weatherService = new WeatherService();

// 导出天气服务
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeatherService;
}