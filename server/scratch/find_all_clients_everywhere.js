const { MongoClient } = require('mongodb');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const findEverywhere = async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('Connected.');

    const admin = client.db('admin');
    const dbs = await admin.admin().listDatabases();
    const dbNames = dbs.databases.map(d => d.name);

    for (const dbName of dbNames) {
      const db = client.db(dbName);
      const collections = await db.listCollections().toArray();
      const colNames = collections.map(c => c.name);

      if (colNames.includes('clients')) {
        const count = await db.collection('clients').countDocuments();
        if (count > 0) {
          console.log(`DB ${dbName} has ${count} clients.`);
          const samples = await db.collection('clients').find().limit(2).toArray();
          console.log('Samples:', samples.map(s => ({ id: s._id, name: s.personalInfo?.name })));
        }
      }
    }

    await client.close();
  } catch (err) {
    console.error(err);
  }
};

findEverywhere();
