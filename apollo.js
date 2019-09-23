const { ApolloServer, gql } = require('apollo-server-express');
const models = require('./models');

const typeDefs = gql`
	type User {
    _id: ID
		name: String
    email: String
  }
  type Client {
    _id: ID
    name: String
    email: String
    cpf: String
    phone: String
    created: String
    is_lead: Boolean
    is_archived: Boolean
    lead_description: String
    company: Company
    products: [ClientProduct]
    tasks: [Task]
    logs: [Log]
  }
  type ClientProduct {
    product: Product
    status: Status
  }
  type Status {
    id: String
    name: String
  }
  type Log {
    _id: ID
    content: String
    client: Client
    created: String
    creator: User
  }
  type Task {
    _id: ID
    content: String
    client: Client
    created: String
    completed: Boolean
    creator: User
    assignees: [User]
    date: String
  }
  type Message {
    _id: ID
    content: String
    created: String
  }
  type Company {
    _id: ID
    name: String
  }
  type Product {
    _id: ID
    name: String
    status_list: [StatusList]
  }
  type StatusList {
    id: String
    name: String
  }
  type Query {
    users: [User]
    user(_id: ID): User
    clients(client: ClientInput): [Client]
    client(_id: ID): Client
    logs: [Log]
    log(_id: ID): Log
    tasks: [Task]
    task(_id: ID): Task
    tasksFromPeriod(startDate: String endDate: String): [Task]
  }
  type Mutation {
    addClient(client: ClientInput): Client
    editClient(client: ClientInput): Client
    removeClient(client: ClientInput): Client

    addTask(task: TaskInput): Task
    editTask(task: TaskInput): Task
    removeTask(task: TaskInput): Task

    addLog(log: LogInput): Log
    editLog(log: LogInput): Log
    removeLog(log: LogInput): Log
  }
  input ClientInput {
    _id: ID
    name: String
    email: String
    phone: String
    is_lead: Boolean
    is_archived: Boolean
    lead_description: String
    company: ID
    creator: ID
  }
  input LogInput {
    _id: ID
    content: String
    created: String
    client_id: ID
    user_id: ID
  }
  input TaskInput {
    _id: ID
    content: String
    client_id: String
    created: String
    completed: Boolean
    creator: ID
    assignees: [ID]
    date: String
  }
`;

const prepare = (obj) => {
  if(obj) {
    obj = obj.toObject()
  obj._id = String(obj._id)
  return obj
  } else {
    return null
  }
  
}

const getInfo = (info) => {
  let modelName = info.returnType.toString()
  const isCollection = modelName.indexOf('[') >=0

  modelName = modelName.replace('[','').replace(']','')
  const ParentName = info.parentType.toString()
  const parentName = info.parentType.toString().toLowerCase()
  const Model = models[`${modelName}s`]

  modelName = modelName.toLowerCase()
  const ParentModel = models[`${ParentName}s`]

  return { Model, modelName, parentName, isCollection, ParentModel }
}

const linkToParent = (config) => async (parent, args, context, info) => {
  if(!config) config = {
    habtm: false
  }
  const { Model, modelName, parentName, isCollection } = getInfo(info)

  if(config.habtm) {
    let field = Object.keys(Model.schema.obj).find(field => field === `${parentName}_ids`)
    if(typeof field === 'undefined') {
      return (await Model.find({ '_id': { $in: parent[`${config.fieldName ? config.fieldName : modelName+'_ids' }`] } }).exec()).map(prepare)
    }
  }

  return isCollection ?
    (await Model.find({[`${parentName}_id${config.habtm ? 's' : ''}`]: parent._id}).exec()).map(prepare) :
    prepare(await Model.findOne(parent[`${modelName}_id`]))
}

const linkToModel = async (parent, args, context, info) => {
  const { Model, isCollection, modelName } = getInfo(info)

  if(typeof args[modelName] !== 'undefined' ) args = args[modelName];
  
  return isCollection ?
    (await Model.find(args).exec()).map(prepare) :
    prepare(await Model.findOne(args).exec())
}

const addMutation = (config) => async (parent, args, context, info) => {
  const Model = config.model;
  const model = Model.toLowerCase();
  return prepare(await models[`${Model}s`].create(args[model]))
}

const editMutation = (config) => async (parent, args, context, info) => {
  const Model = config.model;
  const model = Model.toLowerCase();
  const {_id} = args[model];
  const setArgs = { ...args[model]}
  delete setArgs._id
  await models[`${Model}s`].update({_id}, {$set: setArgs})
  return prepare(await models[`${Model}s`].findOne({_id}).exec())
}

const removeMutation = (config) => async (parent, args, context, info) => {
  const Model = config.model;
  const model = Model.toLowerCase();
  const {_id} = args[model];
  await models[`${Model}s`].remove({_id}).exec()
  return {_id};
}

const resolvers = {
  // ============
  // Custom Types
  // ============
  ClientProduct: {
    status: async (parent,args,context,info) => {
      const {status_list} = prepare(await models.Products.findOne(parent.product._id).exec())
      return status_list.find(s => s.id === parent.status)
    }
  },
  Product: {
    status_list: async (parent, args, context, info) => {
      const {ParentModel} = getInfo(info);
      return prepare(await ParentModel.findOne(parent._id).exec()).status_list
    }
  },
  Task: {
    assignees: linkToParent({habtm: true, fieldName: 'assignees'}),
    creator: linkToParent(),
    client: linkToParent()
  },
  Log: {
    creator: linkToParent()
  },
  Client: {
    tasks: linkToParent(),
    logs: linkToParent(),
  },
  
  // =====
  // Query
  // =====
  Query: {
		users: linkToModel,
    user: linkToModel,
    clients: linkToModel,
    client: linkToModel,
    logs: linkToModel,
    log: linkToModel,
    tasks: linkToModel,
    task: linkToModel,
    tasksFromPeriod: async (parent, args, context, info) => {
      let {startDate, endDate} = args;
      const query = {date: {$gte: new Date(startDate), $lte: new Date(endDate)}}
      return (await models.Tasks.find(query).exec()).map(prepare)
    }
  },

  // ========
  // Mutation
  // ========
  Mutation: {
    addClient: addMutation({model: 'Client'}),
    editClient: editMutation({model: 'Client'}),
    removeClient: removeMutation({model: 'Client'}),

    addLog: addMutation({model: 'Log'}),
    editLog: editMutation({model: 'Log'}),
    removeLog: removeMutation({model: 'Log'}),

    addTask: addMutation({model: 'Task'}),
    editTask: editMutation({model: 'Task'}),
    removeTask: removeMutation({model: 'Task'}),
  }
};

const apolloServer = new ApolloServer({ typeDefs, resolvers, playground: {
	settings: {'editor.cursorShape': 'line'}
}});

module.exports = apolloServer;