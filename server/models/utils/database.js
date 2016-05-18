import fs from "fs";
import { Cluster, N1qlQuery } from "couchbase"
import Promise from "bluebird";
import _ from "lodash";

const dbConfig = JSON.parse(fs.readFileSync("config.json")).couchbase;

function getNoopFunction(value) {
  return () => value;
}

function getNoopDatabase() {
  return {
    games: {
      save: getNoopFunction(),
      getAll: getNoopFunction(Promise.resolve([]))
    },
    competitions: {
      save: getNoopFunction(),
      getAll: getNoopFunction(Promise.resolve([]))
    }
  }
}

function getWriteOnlyDatabase(bucket) {
  let dbAPI = getWorkingDatabase(bucket);
  dbAPI.games.getAll = getNoopFunction(Promise.resolve([]));
  dbAPI.competitions.getAll =  getNoopFunction(Promise.resolve([]));
  return dbAPI;
}

function getWorkingDatabase(bucket) {

  let bucketQuery = Promise.promisify(bucket.query, { context: bucket });
  let bucketUpsert = Promise.promisify(bucket.upsert, { context: bucket });

  function saveGame(object) {
    object.type = "game";
    object.date = (new Date()).toString();
    object.timestamp = Date.now();
    return bucketUpsert(object.id, object);
  }

  function getAllGames(gameClassName) {
    let query = N1qlQuery.fromString(`
      SELECT default.* FROM default
      where type = "game" and game.gameClass = "${gameClassName}"
    `);
    return bucketQuery(query);
  }

  function saveCompetition(object) {
    let competition = _.omit(object, ['gameRegistry', 'games']);
    competition.gameIds = _.map(object.games, game => game.id);
    competition.type = "competition";
    competition.date = (new Date()).toString();
    competition.timestamp = Date.now();
    return bucketUpsert(competition.id, competition);
  }

  function getAllCompetitions(gameClassName) {
    let query = N1qlQuery.fromString(`
      select comp, currentGame, date, id, playerReg, status, timestamp, type, gameIds
      from default
      where type = "competition"
      and comp.params.gameName = "${gameClassName}"
    `);
    return bucketQuery(query);
  }

  return {
    games: {
      save: saveGame,
      getAll: getAllGames
    },
    competitions: {
      save: saveCompetition,
      getAll: getAllCompetitions
    }
  }
}

let databaseInstancePromise = new Promise(function (resolve /*, reject*/) {

  if (!dbConfig.enabled) {
    resolve(getNoopDatabase());
    return;
  }

  let cluster = new Cluster(dbConfig.cluster);

  let bucket = cluster.openBucket(dbConfig.bucket, dbConfig.password, function (error) {

    if (error) {
      console.error(`Please create the bucket in your couchbase server first
        Don't forget to create index as well!
        Cancelling database use for this run.`);
      resolve(getNoopDatabase());
      return;
    }

    if (dbConfig.writeOnly === true) {
      resolve(getWriteOnlyDatabase(bucket));
    } else {
      resolve(getWorkingDatabase(bucket));
    }
  });
});

let database = {
  games: {
    save: function (object) {
      return databaseInstancePromise.then(dbInstance => dbInstance.games.save(object));
    },
    getAll: function (gameClassName) {
      return databaseInstancePromise.then(dbInstance => dbInstance.games.getAll(gameClassName));
    }
  },
  competitions: {
    save: function (object) {
      return databaseInstancePromise.then(dbInstance => dbInstance.competitions.save(object));
    },
    getAll: function (gameClassName) {
      return databaseInstancePromise
        .then(dbInstance => dbInstance.competitions.getAll(gameClassName));
    }
  }
};

export default database;
