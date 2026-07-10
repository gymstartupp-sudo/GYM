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
      if (!models || !models[modelName]) {
        if (modelName === 'Counter') {
          const model = mongoose.models[modelName] || mongoose.model(modelName, schema);
          return new model(...args);
        }
        throw new Error(`Tenant context is not established for model: ${modelName}`);
      }
      const model = models[modelName];
      return new model(...args);
    },
    apply(target, thisArg, args) {
      const models = getActiveModels();
      if (!models || !models[modelName]) {
        if (modelName === 'Counter') {
          const model = mongoose.models[modelName] || mongoose.model(modelName, schema);
          return model.apply(model, args);
        }
        throw new Error(`Tenant context is not established for model: ${modelName}`);
      }
      const model = models[modelName];
      return model.apply(model, args);
    },
    get(target, prop) {
      if (prop === 'schema') {
        return schema;
      }
      const models = getActiveModels();
      if (!models || !models[modelName]) {
        if (modelName === 'Counter') {
          const model = mongoose.models[modelName] || mongoose.model(modelName, schema);
          if (prop === 'then') {
            return undefined;
          }
          const value = model[prop];
          return typeof value === 'function' ? value.bind(model) : value;
        }
        throw new Error(`Tenant context is not established for model: ${modelName}`);
      }
      const model = models[modelName];
      
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
