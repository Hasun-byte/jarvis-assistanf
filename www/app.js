(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // node_modules/@capacitor/core/dist/index.js
  var ExceptionCode, CapacitorException, getPlatformId, createCapacitor, initCapacitorGlobal, Capacitor, registerPlugin, WebPlugin, encode, decode, CapacitorCookiesPluginWeb, CapacitorCookies, readBlobAsBase64, normalizeHttpHeaders, buildUrlParams, buildRequestInit, CapacitorHttpPluginWeb, CapacitorHttp, SystemBarsStyle, SystemBarType, SystemBarsPluginWeb, SystemBars;
  var init_dist = __esm({
    "node_modules/@capacitor/core/dist/index.js"() {
      (function(ExceptionCode2) {
        ExceptionCode2["Unimplemented"] = "UNIMPLEMENTED";
        ExceptionCode2["Unavailable"] = "UNAVAILABLE";
      })(ExceptionCode || (ExceptionCode = {}));
      CapacitorException = class extends Error {
        constructor(message, code, data) {
          super(message);
          this.message = message;
          this.code = code;
          this.data = data;
        }
      };
      getPlatformId = (win) => {
        var _a, _b;
        if (win === null || win === void 0 ? void 0 : win.androidBridge) {
          return "android";
        } else if ((_b = (_a = win === null || win === void 0 ? void 0 : win.webkit) === null || _a === void 0 ? void 0 : _a.messageHandlers) === null || _b === void 0 ? void 0 : _b.bridge) {
          return "ios";
        } else {
          return "web";
        }
      };
      createCapacitor = (win) => {
        const capCustomPlatform = win.CapacitorCustomPlatform || null;
        const cap = win.Capacitor || {};
        const Plugins = cap.Plugins = cap.Plugins || {};
        const getPlatform = () => {
          return capCustomPlatform !== null ? capCustomPlatform.name : getPlatformId(win);
        };
        const isNativePlatform = () => getPlatform() !== "web";
        const isPluginAvailable = (pluginName) => {
          const plugin = registeredPlugins.get(pluginName);
          if (plugin === null || plugin === void 0 ? void 0 : plugin.platforms.has(getPlatform())) {
            return true;
          }
          if (getPluginHeader(pluginName)) {
            return true;
          }
          return false;
        };
        const getPluginHeader = (pluginName) => {
          var _a;
          return (_a = cap.PluginHeaders) === null || _a === void 0 ? void 0 : _a.find((h) => h.name === pluginName);
        };
        const handleError = (err) => win.console.error(err);
        const registeredPlugins = /* @__PURE__ */ new Map();
        const registerPlugin2 = (pluginName, jsImplementations = {}) => {
          const registeredPlugin = registeredPlugins.get(pluginName);
          if (registeredPlugin) {
            console.warn(`Capacitor plugin "${pluginName}" already registered. Cannot register plugins twice.`);
            return registeredPlugin.proxy;
          }
          const platform = getPlatform();
          const pluginHeader = getPluginHeader(pluginName);
          let jsImplementation;
          const loadPluginImplementation = async () => {
            if (!jsImplementation && platform in jsImplementations) {
              jsImplementation = typeof jsImplementations[platform] === "function" ? jsImplementation = await jsImplementations[platform]() : jsImplementation = jsImplementations[platform];
            } else if (capCustomPlatform !== null && !jsImplementation && "web" in jsImplementations) {
              jsImplementation = typeof jsImplementations["web"] === "function" ? jsImplementation = await jsImplementations["web"]() : jsImplementation = jsImplementations["web"];
            }
            return jsImplementation;
          };
          const createPluginMethod = (impl, prop) => {
            var _a, _b;
            if (pluginHeader) {
              const methodHeader = pluginHeader === null || pluginHeader === void 0 ? void 0 : pluginHeader.methods.find((m) => prop === m.name);
              if (methodHeader) {
                if (methodHeader.rtype === "promise") {
                  return (options) => cap.nativePromise(pluginName, prop.toString(), options);
                } else {
                  return (options, callback) => cap.nativeCallback(pluginName, prop.toString(), options, callback);
                }
              } else if (impl) {
                return (_a = impl[prop]) === null || _a === void 0 ? void 0 : _a.bind(impl);
              }
            } else if (impl) {
              return (_b = impl[prop]) === null || _b === void 0 ? void 0 : _b.bind(impl);
            } else {
              throw new CapacitorException(`"${pluginName}" plugin is not implemented on ${platform}`, ExceptionCode.Unimplemented);
            }
          };
          const createPluginMethodWrapper = (prop) => {
            let remove;
            const wrapper = (...args) => {
              const p = loadPluginImplementation().then((impl) => {
                const fn = createPluginMethod(impl, prop);
                if (fn) {
                  const p2 = fn(...args);
                  remove = p2 === null || p2 === void 0 ? void 0 : p2.remove;
                  return p2;
                } else {
                  throw new CapacitorException(`"${pluginName}.${prop}()" is not implemented on ${platform}`, ExceptionCode.Unimplemented);
                }
              });
              if (prop === "addListener") {
                p.remove = async () => remove();
              }
              return p;
            };
            wrapper.toString = () => `${prop.toString()}() { [capacitor code] }`;
            Object.defineProperty(wrapper, "name", {
              value: prop,
              writable: false,
              configurable: false
            });
            return wrapper;
          };
          const addListener = createPluginMethodWrapper("addListener");
          const removeListener = createPluginMethodWrapper("removeListener");
          const addListenerNative = (eventName, callback) => {
            const call = addListener({ eventName }, callback);
            const remove = async () => {
              const callbackId = await call;
              removeListener({
                eventName,
                callbackId
              }, callback);
            };
            const p = new Promise((resolve) => call.then(() => resolve({ remove })));
            p.remove = async () => {
              console.warn(`Using addListener() without 'await' is deprecated.`);
              await remove();
            };
            return p;
          };
          const proxy = new Proxy({}, {
            get(_, prop) {
              switch (prop) {
                // https://github.com/facebook/react/issues/20030
                case "$$typeof":
                  return void 0;
                case "toJSON":
                  return () => ({});
                case "addListener":
                  return pluginHeader ? addListenerNative : addListener;
                case "removeListener":
                  return removeListener;
                default:
                  return createPluginMethodWrapper(prop);
              }
            }
          });
          Plugins[pluginName] = proxy;
          registeredPlugins.set(pluginName, {
            name: pluginName,
            proxy,
            platforms: /* @__PURE__ */ new Set([...Object.keys(jsImplementations), ...pluginHeader ? [platform] : []])
          });
          return proxy;
        };
        if (!cap.convertFileSrc) {
          cap.convertFileSrc = (filePath) => filePath;
        }
        cap.getPlatform = getPlatform;
        cap.handleError = handleError;
        cap.isNativePlatform = isNativePlatform;
        cap.isPluginAvailable = isPluginAvailable;
        cap.registerPlugin = registerPlugin2;
        cap.Exception = CapacitorException;
        cap.DEBUG = !!cap.DEBUG;
        cap.isLoggingEnabled = !!cap.isLoggingEnabled;
        return cap;
      };
      initCapacitorGlobal = (win) => win.Capacitor = createCapacitor(win);
      Capacitor = /* @__PURE__ */ initCapacitorGlobal(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
      registerPlugin = Capacitor.registerPlugin;
      WebPlugin = class {
        constructor() {
          this.listeners = {};
          this.retainedEventArguments = {};
          this.windowListeners = {};
        }
        addListener(eventName, listenerFunc) {
          let firstListener = false;
          const listeners = this.listeners[eventName];
          if (!listeners) {
            this.listeners[eventName] = [];
            firstListener = true;
          }
          this.listeners[eventName].push(listenerFunc);
          const windowListener = this.windowListeners[eventName];
          if (windowListener && !windowListener.registered) {
            this.addWindowListener(windowListener);
          }
          if (firstListener) {
            this.sendRetainedArgumentsForEvent(eventName);
          }
          const remove = async () => this.removeListener(eventName, listenerFunc);
          const p = Promise.resolve({ remove });
          return p;
        }
        async removeAllListeners() {
          this.listeners = {};
          for (const listener in this.windowListeners) {
            this.removeWindowListener(this.windowListeners[listener]);
          }
          this.windowListeners = {};
        }
        notifyListeners(eventName, data, retainUntilConsumed) {
          const listeners = this.listeners[eventName];
          if (!listeners) {
            if (retainUntilConsumed) {
              let args = this.retainedEventArguments[eventName];
              if (!args) {
                args = [];
              }
              args.push(data);
              this.retainedEventArguments[eventName] = args;
            }
            return;
          }
          listeners.forEach((listener) => listener(data));
        }
        hasListeners(eventName) {
          var _a;
          return !!((_a = this.listeners[eventName]) === null || _a === void 0 ? void 0 : _a.length);
        }
        registerWindowListener(windowEventName, pluginEventName) {
          this.windowListeners[pluginEventName] = {
            registered: false,
            windowEventName,
            pluginEventName,
            handler: (event) => {
              this.notifyListeners(pluginEventName, event);
            }
          };
        }
        unimplemented(msg = "not implemented") {
          return new Capacitor.Exception(msg, ExceptionCode.Unimplemented);
        }
        unavailable(msg = "not available") {
          return new Capacitor.Exception(msg, ExceptionCode.Unavailable);
        }
        async removeListener(eventName, listenerFunc) {
          const listeners = this.listeners[eventName];
          if (!listeners) {
            return;
          }
          const index = listeners.indexOf(listenerFunc);
          if (index !== -1) {
            this.listeners[eventName].splice(index, 1);
          }
          if (!this.listeners[eventName].length) {
            this.removeWindowListener(this.windowListeners[eventName]);
          }
        }
        addWindowListener(handle) {
          window.addEventListener(handle.windowEventName, handle.handler);
          handle.registered = true;
        }
        removeWindowListener(handle) {
          if (!handle) {
            return;
          }
          window.removeEventListener(handle.windowEventName, handle.handler);
          handle.registered = false;
        }
        sendRetainedArgumentsForEvent(eventName) {
          const args = this.retainedEventArguments[eventName];
          if (!args) {
            return;
          }
          delete this.retainedEventArguments[eventName];
          args.forEach((arg) => {
            this.notifyListeners(eventName, arg);
          });
        }
      };
      encode = (str) => encodeURIComponent(str).replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent).replace(/[()]/g, escape);
      decode = (str) => str.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
      CapacitorCookiesPluginWeb = class extends WebPlugin {
        async getCookies() {
          const cookies = document.cookie;
          const cookieMap = {};
          cookies.split(";").forEach((cookie) => {
            if (cookie.length <= 0)
              return;
            let [key, value] = cookie.replace(/=/, "CAP_COOKIE").split("CAP_COOKIE");
            key = decode(key).trim();
            value = decode(value).trim();
            cookieMap[key] = value;
          });
          return cookieMap;
        }
        async setCookie(options) {
          try {
            const encodedKey = encode(options.key);
            const encodedValue = encode(options.value);
            const expires = options.expires ? `; expires=${options.expires.replace("expires=", "")}` : "";
            const path = (options.path || "/").replace("path=", "");
            const domain = options.url != null && options.url.length > 0 ? `domain=${options.url}` : "";
            document.cookie = `${encodedKey}=${encodedValue || ""}${expires}; path=${path}; ${domain};`;
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async deleteCookie(options) {
          try {
            document.cookie = `${options.key}=; Max-Age=0`;
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async clearCookies() {
          try {
            const cookies = document.cookie.split(";") || [];
            for (const cookie of cookies) {
              document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, `=;expires=${(/* @__PURE__ */ new Date()).toUTCString()};path=/`);
            }
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async clearAllCookies() {
          try {
            await this.clearCookies();
          } catch (error) {
            return Promise.reject(error);
          }
        }
      };
      CapacitorCookies = registerPlugin("CapacitorCookies", {
        web: () => new CapacitorCookiesPluginWeb()
      });
      readBlobAsBase64 = async (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result;
          resolve(base64String.indexOf(",") >= 0 ? base64String.split(",")[1] : base64String);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
      });
      normalizeHttpHeaders = (headers = {}) => {
        const originalKeys = Object.keys(headers);
        const loweredKeys = Object.keys(headers).map((k) => k.toLocaleLowerCase());
        const normalized = loweredKeys.reduce((acc, key, index) => {
          acc[key] = headers[originalKeys[index]];
          return acc;
        }, {});
        return normalized;
      };
      buildUrlParams = (params, shouldEncode = true) => {
        if (!params)
          return null;
        const output = Object.entries(params).reduce((accumulator, entry) => {
          const [key, value] = entry;
          let encodedValue;
          let item;
          if (Array.isArray(value)) {
            item = "";
            value.forEach((str) => {
              encodedValue = shouldEncode ? encodeURIComponent(str) : str;
              item += `${key}=${encodedValue}&`;
            });
            item.slice(0, -1);
          } else {
            encodedValue = shouldEncode ? encodeURIComponent(value) : value;
            item = `${key}=${encodedValue}`;
          }
          return `${accumulator}&${item}`;
        }, "");
        return output.substr(1);
      };
      buildRequestInit = (options, extra = {}) => {
        const output = Object.assign({ method: options.method || "GET", headers: options.headers }, extra);
        const headers = normalizeHttpHeaders(options.headers);
        const type = headers["content-type"] || "";
        if (typeof options.data === "string") {
          output.body = options.data;
        } else if (type.includes("application/x-www-form-urlencoded")) {
          const params = new URLSearchParams();
          for (const [key, value] of Object.entries(options.data || {})) {
            params.set(key, value);
          }
          output.body = params.toString();
        } else if (type.includes("multipart/form-data") || options.data instanceof FormData) {
          const form = new FormData();
          if (options.data instanceof FormData) {
            options.data.forEach((value, key) => {
              form.append(key, value);
            });
          } else {
            for (const key of Object.keys(options.data)) {
              form.append(key, options.data[key]);
            }
          }
          output.body = form;
          const headers2 = new Headers(output.headers);
          headers2.delete("content-type");
          output.headers = headers2;
        } else if (type.includes("application/json") || typeof options.data === "object") {
          output.body = JSON.stringify(options.data);
        }
        return output;
      };
      CapacitorHttpPluginWeb = class extends WebPlugin {
        /**
         * Perform an Http request given a set of options
         * @param options Options to build the HTTP request
         */
        async request(options) {
          const requestInit = buildRequestInit(options, options.webFetchExtra);
          const urlParams = buildUrlParams(options.params, options.shouldEncodeUrlParams);
          const url = urlParams ? `${options.url}?${urlParams}` : options.url;
          const response = await fetch(url, requestInit);
          const contentType = response.headers.get("content-type") || "";
          let { responseType = "text" } = response.ok ? options : {};
          if (contentType.includes("application/json")) {
            responseType = "json";
          }
          let data;
          let blob;
          switch (responseType) {
            case "arraybuffer":
            case "blob":
              blob = await response.blob();
              data = await readBlobAsBase64(blob);
              break;
            case "json":
              data = await response.json();
              break;
            case "document":
            case "text":
            default:
              data = await response.text();
          }
          const headers = {};
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });
          return {
            data,
            headers,
            status: response.status,
            url: response.url
          };
        }
        /**
         * Perform an Http GET request given a set of options
         * @param options Options to build the HTTP request
         */
        async get(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "GET" }));
        }
        /**
         * Perform an Http POST request given a set of options
         * @param options Options to build the HTTP request
         */
        async post(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "POST" }));
        }
        /**
         * Perform an Http PUT request given a set of options
         * @param options Options to build the HTTP request
         */
        async put(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "PUT" }));
        }
        /**
         * Perform an Http PATCH request given a set of options
         * @param options Options to build the HTTP request
         */
        async patch(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "PATCH" }));
        }
        /**
         * Perform an Http DELETE request given a set of options
         * @param options Options to build the HTTP request
         */
        async delete(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "DELETE" }));
        }
      };
      CapacitorHttp = registerPlugin("CapacitorHttp", {
        web: () => new CapacitorHttpPluginWeb()
      });
      (function(SystemBarsStyle2) {
        SystemBarsStyle2["Dark"] = "DARK";
        SystemBarsStyle2["Light"] = "LIGHT";
        SystemBarsStyle2["Default"] = "DEFAULT";
      })(SystemBarsStyle || (SystemBarsStyle = {}));
      (function(SystemBarType2) {
        SystemBarType2["StatusBar"] = "StatusBar";
        SystemBarType2["NavigationBar"] = "NavigationBar";
      })(SystemBarType || (SystemBarType = {}));
      SystemBarsPluginWeb = class extends WebPlugin {
        async setStyle() {
          this.unavailable("not available for web");
        }
        async setAnimation() {
          this.unavailable("not available for web");
        }
        async show() {
          this.unavailable("not available for web");
        }
        async hide() {
          this.unavailable("not available for web");
        }
      };
      SystemBars = registerPlugin("SystemBars", {
        web: () => new SystemBarsPluginWeb()
      });
    }
  });

  // node_modules/@capacitor-community/speech-recognition/dist/esm/web.js
  var web_exports = {};
  __export(web_exports, {
    SpeechRecognition: () => SpeechRecognition,
    SpeechRecognitionWeb: () => SpeechRecognitionWeb
  });
  var SpeechRecognitionWeb, SpeechRecognition;
  var init_web = __esm({
    "node_modules/@capacitor-community/speech-recognition/dist/esm/web.js"() {
      init_dist();
      SpeechRecognitionWeb = class extends WebPlugin {
        available() {
          throw this.unimplemented("Method not implemented on web.");
        }
        start(_options) {
          throw this.unimplemented("Method not implemented on web.");
        }
        stop() {
          throw this.unimplemented("Method not implemented on web.");
        }
        getSupportedLanguages() {
          throw this.unimplemented("Method not implemented on web.");
        }
        hasPermission() {
          throw this.unimplemented("Method not implemented on web.");
        }
        isListening() {
          throw this.unimplemented("Method not implemented on web.");
        }
        requestPermission() {
          throw this.unimplemented("Method not implemented on web.");
        }
        checkPermissions() {
          throw this.unimplemented("Method not implemented on web.");
        }
        requestPermissions() {
          throw this.unimplemented("Method not implemented on web.");
        }
      };
      SpeechRecognition = new SpeechRecognitionWeb();
    }
  });

  // node_modules/@capacitor-community/text-to-speech/dist/esm/web.js
  var web_exports2 = {};
  __export(web_exports2, {
    TextToSpeechWeb: () => TextToSpeechWeb
  });
  var TextToSpeechWeb;
  var init_web2 = __esm({
    "node_modules/@capacitor-community/text-to-speech/dist/esm/web.js"() {
      init_dist();
      TextToSpeechWeb = class extends WebPlugin {
        constructor() {
          super();
          this.speechSynthesis = null;
          if ("speechSynthesis" in window) {
            this.speechSynthesis = window.speechSynthesis;
            window.addEventListener("beforeunload", () => {
              this.stop();
            });
          }
        }
        async speak(options) {
          if (!this.speechSynthesis) {
            this.throwUnsupportedError();
          }
          await this.stop();
          const speechSynthesis = this.speechSynthesis;
          const utterance = this.createSpeechSynthesisUtterance(options);
          return new Promise((resolve, reject) => {
            utterance.onend = () => {
              resolve();
            };
            utterance.onerror = (event) => {
              reject(event);
            };
            speechSynthesis.speak(utterance);
          });
        }
        async stop() {
          if (!this.speechSynthesis) {
            this.throwUnsupportedError();
          }
          this.speechSynthesis.cancel();
        }
        async getSupportedLanguages() {
          const voices = this.getSpeechSynthesisVoices();
          const languages = voices.map((voice) => voice.lang);
          const filteredLanguages = languages.filter((v, i, a) => a.indexOf(v) == i);
          return { languages: filteredLanguages };
        }
        async getSupportedVoices() {
          const voices = this.getSpeechSynthesisVoices();
          return { voices };
        }
        async isLanguageSupported(options) {
          const result = await this.getSupportedLanguages();
          const isLanguageSupported = result.languages.includes(options.lang);
          return { supported: isLanguageSupported };
        }
        async openInstall() {
          this.throwUnimplementedError();
        }
        createSpeechSynthesisUtterance(options) {
          const voices = this.getSpeechSynthesisVoices();
          const utterance = new SpeechSynthesisUtterance();
          const { text, lang, rate, pitch, volume, voice } = options;
          if (voice !== void 0) {
            utterance.voice = voices[voice];
          }
          if (volume !== void 0) {
            utterance.volume = volume >= 0 && volume <= 1 ? volume : 1;
          }
          if (rate !== void 0) {
            utterance.rate = rate >= 0.1 && rate <= 10 ? rate : 1;
          }
          if (pitch !== void 0) {
            utterance.pitch = pitch >= 0 && pitch <= 2 ? pitch : 2;
          }
          if (lang) {
            utterance.lang = lang;
          }
          utterance.text = text;
          return utterance;
        }
        getSpeechSynthesisVoices() {
          if (!this.speechSynthesis) {
            this.throwUnsupportedError();
          }
          if (!this.supportedVoices || this.supportedVoices.length < 1) {
            this.supportedVoices = this.speechSynthesis.getVoices();
          }
          return this.supportedVoices;
        }
        throwUnsupportedError() {
          throw this.unavailable("SpeechSynthesis API not available in this browser.");
        }
        throwUnimplementedError() {
          throw this.unimplemented("Not implemented on web.");
        }
      };
    }
  });

  // src/main.js
  init_dist();

  // node_modules/@capacitor-community/speech-recognition/dist/esm/index.js
  init_dist();
  var SpeechRecognition2 = registerPlugin("SpeechRecognition", {
    web: () => Promise.resolve().then(() => (init_web(), web_exports)).then((m) => new m.SpeechRecognitionWeb())
  });

  // node_modules/@capacitor-community/text-to-speech/dist/esm/index.js
  init_dist();

  // node_modules/@capacitor-community/text-to-speech/dist/esm/definitions.js
  var QueueStrategy;
  (function(QueueStrategy2) {
    QueueStrategy2[QueueStrategy2["Flush"] = 0] = "Flush";
    QueueStrategy2[QueueStrategy2["Add"] = 1] = "Add";
  })(QueueStrategy || (QueueStrategy = {}));

  // node_modules/@capacitor-community/text-to-speech/dist/esm/index.js
  var TextToSpeech = registerPlugin("TextToSpeech", {
    web: () => Promise.resolve().then(() => (init_web2(), web_exports2)).then((m) => new m.TextToSpeechWeb())
  });
  if ("speechSynthesis" in window) {
    window.speechSynthesis;
  }

  // src/main.js
  var DeviceControl = registerPlugin("DeviceControl");
  var $ = (id) => document.getElementById(id);
  var chatEl = $("chat");
  var orb = $("orb");
  var statusEl = $("status");
  var STORAGE_KEY = "jarvis_settings_v1";
  var HISTORY_KEY = "jarvis_history_v1";
  function loadSettings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { provider: "anthropic", apiKey: "", autoSpeak: true };
    } catch {
      return { provider: "anthropic", apiKey: "", autoSpeak: true };
    }
  }
  function saveSettings(s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }
  var settings = loadSettings();
  var history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  function addMessage(text, cls) {
    const div = document.createElement("div");
    div.className = "msg " + cls;
    div.textContent = text;
    chatEl.appendChild(div);
    chatEl.scrollTop = chatEl.scrollHeight;
  }
  function renderHistory() {
    chatEl.innerHTML = "";
    history.forEach((m) => addMessage(m.text, m.role === "user" ? "user" : "ai"));
  }
  renderHistory();
  if (history.length === 0) {
    addMessage("Halo, saya Jarvis. Saya bisa mengobrol dan mengontrol beberapa fungsi perangkat Anda: senter, volume, dan membuka aplikasi. Ketuk \u2699 untuk atur API key AI terlebih dahulu.", "system");
  }
  function setStatus(text) {
    statusEl.textContent = text;
  }
  var modal = $("settingsModal");
  $("settingsBtn").onclick = () => {
    $("providerSelect").value = settings.provider;
    $("apiKeyInput").value = settings.apiKey || "";
    $("autoSpeak").checked = settings.autoSpeak !== false;
    modal.classList.remove("hidden");
  };
  $("closeSettings").onclick = () => {
    settings.provider = $("providerSelect").value;
    settings.apiKey = $("apiKeyInput").value.trim();
    settings.autoSpeak = $("autoSpeak").checked;
    saveSettings(settings);
    modal.classList.add("hidden");
  };
  $("grantNotifBtn").onclick = async () => {
    try {
      await DeviceControl.openNotificationAccessSettings();
    } catch (e) {
      addMessage("Tidak bisa membuka pengaturan notifikasi: " + e.message, "system");
    }
  };
  $("grantOverlayBtn").onclick = async () => {
    try {
      await DeviceControl.openOverlaySettings();
    } catch (e) {
      addMessage("Tidak bisa membuka pengaturan overlay: " + e.message, "system");
    }
  };
  var SYSTEM_PROMPT = `Kamu adalah Jarvis, asisten AI pribadi di ponsel Android milik pengguna, bergaya seperti asisten Iron Man: singkat, sopan, sedikit witty.
Kamu HARUS selalu membalas HANYA dengan satu objek JSON valid, tanpa teks lain di luar JSON, dengan bentuk persis:
{"reply": "<kalimat balasan untuk ditampilkan & diucapkan>", "action": null}
atau jika pengguna meminta kontrol perangkat, isi "action" dengan salah satu bentuk berikut:
{"type":"flashlight","value":"on"}  // atau "off"
{"type":"volume","value":<0-100>}
{"type":"open_app","query":"<nama aplikasi yang disebut user, misal whatsapp>"}
Jika tidak ada perintah kontrol perangkat, gunakan "action": null.
Jangan pernah menulis apapun di luar objek JSON tersebut.`;
  async function callAnthropic(userText) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": settings.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [...historyToMessages(), { role: "user", content: userText }]
      })
    });
    if (!res.ok) throw new Error("Anthropic API error: " + res.status + " " + await res.text());
    const data = await res.json();
    const textBlock = (data.content || []).find((c) => c.type === "text");
    return textBlock ? textBlock.text : '{"reply":"Maaf, saya tidak mendapat balasan.","action":null}';
  }
  async function callOpenAI(userText) {
    var _a, _b, _c;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + settings.apiKey
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...historyToMessages(),
          { role: "user", content: userText }
        ],
        max_tokens: 400
      })
    });
    if (!res.ok) throw new Error("OpenAI API error: " + res.status + " " + await res.text());
    const data = await res.json();
    return ((_c = (_b = (_a = data.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content) || '{"reply":"Maaf, saya tidak mendapat balasan.","action":null}';
  }
  var GEMINI_MODEL = "gemini-2.5-flash";
  async function callGemini(userText) {
    var _a, _b, _c, _d;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${settings.apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [...historyToGeminiContents(), { role: "user", parts: [{ text: userText }] }],
        generationConfig: { maxOutputTokens: 400 }
      })
    });
    if (!res.ok) throw new Error("Gemini API error: " + res.status + " " + await res.text());
    const data = await res.json();
    const text = ((_d = (_c = (_b = (_a = data.candidates) == null ? void 0 : _a[0]) == null ? void 0 : _b.content) == null ? void 0 : _c.parts) == null ? void 0 : _d.map((p) => p.text || "").join("")) || "";
    return text || '{"reply":"Maaf, saya tidak mendapat balasan.","action":null}';
  }
  function historyToGeminiContents() {
    return history.slice(-10).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }]
    }));
  }
  function historyToMessages() {
    return history.slice(-10).map((m) => ({ role: m.role, content: m.text }));
  }
  async function askAI(userText) {
    if (!settings.apiKey) {
      addMessage("Belum ada API key. Buka \u2699 Pengaturan dan masukkan API key AI Anda dulu.", "system");
      return;
    }
    setStatus("Berpikir...");
    try {
      const raw = settings.provider === "openai" ? await callOpenAI(userText) : settings.provider === "gemini" ? await callGemini(userText) : await callAnthropic(userText);
      let parsed;
      try {
        const jsonStr = raw.trim().replace(/^```json|```$/g, "").trim();
        parsed = JSON.parse(jsonStr);
      } catch {
        parsed = { reply: raw, action: null };
      }
      addMessage(parsed.reply, "ai");
      history.push({ role: "user", text: userText });
      history.push({ role: "assistant", text: raw });
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-40)));
      if (settings.autoSpeak && parsed.reply) {
        TextToSpeech.speak({ text: parsed.reply, lang: "id-ID", rate: 1 }).catch(() => {
        });
      }
      if (parsed.action) await runAction(parsed.action);
    } catch (e) {
      addMessage("Terjadi kesalahan: " + e.message, "system");
    } finally {
      setStatus("Siap membantu");
    }
  }
  async function runAction(action) {
    try {
      if (action.type === "flashlight") {
        await DeviceControl.setFlashlight({ on: action.value === "on" });
        addMessage("\u26A1 Senter " + (action.value === "on" ? "dinyalakan" : "dimatikan"), "action");
      } else if (action.type === "volume") {
        const pct = Math.max(0, Math.min(100, Number(action.value) || 0));
        await DeviceControl.setVolume({ percent: pct });
        addMessage("\u{1F50A} Volume diatur ke " + pct + "%", "action");
      } else if (action.type === "open_app") {
        const r = await DeviceControl.openApp({ query: action.query || "" });
        addMessage(r && r.success ? "\u{1F4F1} Membuka " + r.appName : '\u26A0 Aplikasi "' + action.query + '" tidak ditemukan', "action");
      }
    } catch (e) {
      addMessage("\u26A0 Gagal menjalankan aksi perangkat: " + e.message, "action");
    }
  }
  $("sendBtn").onclick = sendText;
  $("textInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendText();
  });
  function sendText() {
    const input = $("textInput");
    const val = input.value.trim();
    if (!val) return;
    addMessage(val, "user");
    input.value = "";
    askAI(val);
  }
  var listening = false;
  $("micBtn").onclick = async () => {
    var _a;
    if (listening) return;
    try {
      const perm = await SpeechRecognition2.checkPermissions();
      if (perm.speechRecognition !== "granted") {
        const req = await SpeechRecognition2.requestPermissions();
        if (req.speechRecognition !== "granted") {
          addMessage("Izin mikrofon ditolak.", "system");
          return;
        }
      }
      listening = true;
      orb.classList.add("listening");
      $("micBtn").classList.add("active");
      setStatus("Mendengarkan...");
      SpeechRecognition2.addListener("partialResults", () => {
      });
      const result = await SpeechRecognition2.start({ language: "id-ID", maxResults: 1, partialResults: false, popup: false });
      const text = (_a = result == null ? void 0 : result.matches) == null ? void 0 : _a[0];
      if (text) {
        addMessage(text, "user");
        askAI(text);
      }
    } catch (e) {
      addMessage("Gagal menggunakan mikrofon: " + e.message, "system");
    } finally {
      listening = false;
      orb.classList.remove("listening");
      $("micBtn").classList.remove("active");
      setStatus("Siap membantu");
    }
  };
})();
/*! Bundled license information:

@capacitor/core/dist/index.js:
  (*! Capacitor: https://capacitorjs.com/ - MIT License *)
*/
