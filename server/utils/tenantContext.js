const { AsyncLocalStorage } = require('async_hooks');
const mongoose = require('mongoose');
const asyncLocalStorage = new AsyncLocalStorage();

const runWithTenantContext = (context, callback) => {
  return asyncLocalStorage.run(context, callback);
};

const getActiveContext = () => {
  return asyncLocalStorage.getStore();
};

const getActiveConnection = () => {
  const ctx = getActiveContext();
  return ctx ? ctx.tenantDb : null;
};

const getActiveModels = () => {
  const ctx = getActiveContext();
  return ctx ? ctx.models : null;
};

const createTenantModelProxy = (modelName, schema) => {
  const proxy = new Proxy(function() {}, {
    construct(target, args) {
      const models = getActiveModels();
      const model = (models && models[modelName]) 
        ? models[modelName] 
        : (mongoose.models[modelName] || mongoose.model(modelName, schema));
      return new model(...args);
    },
    apply(target, thisArg, args) {
      const models = getActiveModels();
      const model = (models && models[modelName]) 
        ? models[modelName] 
        : (mongoose.models[modelName] || mongoose.model(modelName, schema));
      return model.apply(model, args);
    },
    get(target, prop) {
      const models = getActiveModels();
      const model = (models && models[modelName]) 
        ? models[modelName] 
        : (mongoose.models[modelName] || mongoose.model(modelName, schema));
      
      if (prop === 'then') {
        return undefined;
      }
      
      const value = model[prop];
      return typeof value === 'function' ? value.bind(model) : value;
    }
  });
  return proxy;
};

module.exports = {
  runWithTenantContext,
  getActiveContext,
  getActiveConnection,
  getActiveModels,
  createTenantModelProxy
};
