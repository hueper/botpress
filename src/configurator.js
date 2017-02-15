import _ from 'lodash'

const validations = {
  'any': (value, validation) => validation(value),
  'string': (value, validation) => typeof(value) === 'string' && validation(value),
  'choice': (value, validation) => _.includes(validation, value),
  'bool': (value, validation) => (value === true || value === false) && validation(value)
}

const defaultValues = {
  'any': null,
  'string': '',
  'bool': false
}

const amendOption = (option, name) => {

  const validTypes = _.keys(validations)
  if (!option.type || !_.includes(validTypes, option.type)) {
    throw new Error(`Invalid type (${option.type || ''}) for config key (${name})`)
  }

  const validation = option.validation || (() => true)

  if (option.default && !validations[option.type](option.default, validation)) {
    throw new Error(`Invalid default value (${option.default}) for (${name})`)
  }

  if (!option.default && !_.includes(_.keys(defaultValues), option.type)) {
    throw new Error(`Default value is mandatory for type ${option.type} (${name})`)
  }

  return {
    type: option.type,
    required: option.required || false,
    env: option.env || null,
    default: option.default || defaultValues[option.type],
    validation: validation
  }
}

const amendOptions = options => {
  return _.mapValues(options, amendOption)
}

const validateSet = (options, name, value) => {

  // if name is not in options, throw
  if (_.includes(_.keys(options)), name) {
    throw new Error('Unrecognized configuration key: ' + name)
  }

  if (!validations[options[name].type](value, options[name].validation)) {
    throw new Error('Invalid value for key: ' + name)
  }
}

const validateSave = (options, object) => {
  const objKeys = _.keys(object)
  const requiredKeys = _.filter(_.keys(options), key => options[key].required)

  _.each(requiredKeys, required => {
    if (!_.includes(objKeys, required)) {
      throw new Error(`Missing required configuration "${required}"`)
    }
  })

  _.each(objKeys, name => {
    validateSet(options, name, object[name])
  })
}

const validateName = name => {
  if (!/[A-Z_-]+/i.test(name)) {
    throw new Error('Invalid configuration name: ' + name + '. The name must only contain letters, _ and -')
  }
}

const createConfig = ({ kvs, name, options }) => {

  validateName(name)
  options = amendOptions(options)

  const saveAll = obj => {
    validateSave(options, obj)
    return kvs.set('__config', obj, name)
  }

  const loadAll = () => {
    // TODO: Overwrite these with ENV variables
    return kvs.get('__config', name)
  }

  const get = name => {
    // TODO: Overwrite these with ENV variables
    return kvs.get('__config', name + '.' + name)
  }

  const set = (name, value) => {
    validateSet(options, name, value)
    return kvs.set('__config', value, name + '.' + name)
  }

  // saveAll(obj) -> Promise()
  // loadAll() -> Promise(obj)
  // get(key) -> Promise(value)
  // set(key, value) -> Promise()
  return { saveAll, loadAll, get, set }
}

module.exports = { createConfig }