import bodyParser from "body-parser";
import express from "express";

import GameRegistry from "../models/game_registry";
import CompetitionRegistry from "../models/competition_registry";

import competitionsRoutes from "./game_competitions";
import gamesRoutes from "./game_games";

import fs from "fs";
const populateConfig = JSON.parse(fs.readFileSync("config.json")).populate;

export default function (Game, compTypes) {
  let gameRegistry = new GameRegistry(Game);
  let compRegistry = new CompetitionRegistry(gameRegistry, compTypes);

  gameRegistry.restoreAllStoredGames(Game)
    .then(() => compRegistry.restoreAllStoredCompetitions(Game, gameRegistry))
    .then(() => console.log('Restored games and competitions of ' + Game.name));

  if (populateConfig) {
    populateConfig.competitions.forEach(function (competitionParams) {
      if (competitionParams.gameName === Game.name) {
        compRegistry.create(competitionParams);
      }
    });

    populateConfig.games.forEach(function (gameParams) {
      if (gameParams.gameName === Game.name) {
        gameRegistry.create(gameParams);
      }
    });
  }

  let router = new express.Router();

  router.use(bodyParser.json());
  router.use("/games", gamesRoutes(gameRegistry));
  router.use("/competitions", competitionsRoutes(gameRegistry, compRegistry));

  return router;
}
