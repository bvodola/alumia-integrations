const express = require('express');

const dt = {
  fullDayString: (date) => {
    return date.getFullYear() +"-"+ ("0" + (date.getMonth()+1)).slice(-2) + "-"+ date.getDate();
  },
  start: (date, timezone='Z') => {
    return new Date(date.getUTCFullYear()+"-"+("0" + (date.getUTCMonth()+1)).slice(-2) + "-"+date.getUTCDate()+"T00:00:00.000"+timezone)
  },
  end: (date, timezone='Z') => {
    return new Date(date.getUTCFullYear()+"-"+("0" + (date.getUTCMonth()+1)).slice(-2) + "-"+date.getUTCDate()+"T23:59:59.999"+timezone)
  }
}

const defaultCallbacks = {
  get: (data) => data,
  post: (data) => data,
  put: (data) => data,
  delete: (data) => data
}

module.exports = (Collection, config) => {
  if(!config) config = {};

  let callbacks = Object.assign({}, defaultCallbacks, config.callbacks);
  let router = express.Router();

  router.post('/', (req, res) => {
    const newEntry = req.body;
    const cb = (e,newEntry) => {
      if(e) {
        console.log(e);
        res.sendStatus(500);
      }
      else res.send(newEntry);
    };

    console.log('newEntry', newEntry);
    if(newEntry instanceof Array) {
      Collection.insertMany(newEntry, (e, newEntry) => {
        cb(e, newEntry)
      });
    } else {
      Collection.create(newEntry, (e, newEntry) => {
        cb(e, newEntry)
      });
    }

  });

  router.get('/*', (req, res) => {
    let singleResult = false,
        skip = 0,
        query = res.locals.query || {},
        { page, sort, fields, limit, search } = req.query;

    fields = typeof fields !== 'undefined' ? fields.split(',') : [];
    limit = typeof limit !== 'undefined' ? parseInt(limit) : 10;
    if(typeof sort === 'undefined') sort = '_id';
  
    if(page) {
      sort === '_id' ?
        query['_id'] = { "$gt": page } :
        skip = (parseInt(page)-1)*limit;
    }

    if(search) {
      // search = search.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
      query.$or = config.searchFields.map((field) => {
        return { [field]: {'$regex': '.*' + search + '.*', '$options': 'i'} }
      });

    }

    if(typeof req.params[0] !== 'undefined' && req.params[0]) {
      if(typeof req.params[0].split(':')[1] !== 'undefined') {
        // Filtering Query
        const filters = req.params[0].split('/');
        filters.forEach((filter) => {
          filter = filter.split(':');
          switch(filter[1]) {
            case 'today':
              let today = new Date();
              filter[1] = {"$gte": dt.start(today), "$lte": dt.end(today)}
              break;
            case 'date':
              let date = new Date(filter[2])
              filter[1] = {"$gte": dt.start(date), "$lte": dt.end(date)}
              break;
            case 'gt':
              filter[1] = {"$gt": filter[2]}
              break;
            case 'gte':
              filter[1] = {"$gte": filter[2]}
              break;
            case 'lt':
              filter[1] = {"$lt": filter[2]}
              break;
            case 'lte':
              filter[1] = {"$lte": filter[2]}
              break;
            case 'between':
              filter[1] = {"$gte": filter[2], "$lte": filter[3]}
              break;
          }

          query[filter[0]] = filter[1];
        });

      } else {
        // Searching one user by id
        singleResult = true;
        query = { _id: req.params[0] };
      }
    }

    Collection.find(query, fields, {sort, limit, skip}).exec((e,results) => {
      if(e) {
        res.status(500).send(e);
        console.log(e.message);
      }
      else {
        if(singleResult)
          res.send(callbacks.get(results[0]));
        else
          res.send(callbacks.get(results));
      }
    });

  });

  router.put('/:_id', (req, res) => {
    const changedEntry = req.body;
    Collection.update({ _id: req.params._id }, { $set: changedEntry }, (err) => {
      if (err)
        res.sendStatus(500);
      else
        res.sendStatus(200);
    });
  });

  router.delete('/:_id', (req, res) => {
    Collection.remove({ _id: req.params._id }, (err) => {
      if (err)
        res.send(err.message);
      else
        res.sendStatus(200);
    });
  });

  return router;

}
