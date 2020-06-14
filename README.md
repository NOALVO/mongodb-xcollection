# mongodb-xcollection

MongoDB extended collection class that frees you from ObjectID and other Extended JSON type conversions.

## How to use

### Automatic conversion
```javascript
// considering you already have a `db` variable that is a native driver Db instance

const XCollection = require('mongodb-xcollection');
const Users = new XCollection(db, 'users');

// find
let users1 = await Users.find({ _id: { $oid: '5e332ae5f4744e0b08e510e8' } });

// insertOne
const createdUser1 = await Users.insertOne({ name: 'Gustavo' });
```

### Manual conversion
```javascript

// find
const findQuery = Users.convertInput({ _id: { $oid: '5e332ae5f4744e0b08e510e8' } });
const users2 = await Users.collection
  .find(findQuery)
  .toArray()
  .then(x => Users.convertOutput(x));

// insertOne
const newUser = Users.convertInput({ name: 'Gustavo' });
const createdUser2 = await Users.collection
  .insertOne(newUser)
  .then(x => Users.convertOutput(x.ops));
```
