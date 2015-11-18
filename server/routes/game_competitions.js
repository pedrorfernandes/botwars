import express from "express";

import CompetitionRegistry from "../models/competition_registry";
import Match from "../models/competitions/match";

export default function (gameEngine) {
  let compEngine = new CompetitionRegistry(Match, gameEngine);

  let router = new express.Router();

  router.param("compId", function (req, res, next, compId) {
    let comp = compEngine.get(compId);
    if (!comp) { res.status(404).send("The requested competition does not exist"); return; }
    req.comp = comp;

    if (req.query.playerToken) {
      let player = comp.getPlayer(req.query.playerToken);
      if (!player) { res.status(404).send("Invalid player"); return; }
      req.player = player;
    }

    next();
  });

  router.get("/", function (req, res) {
    res.json(compEngine.getAllCompetitionsInfo());
  });

  router.post("/", function (req, res) {
    let compId = compEngine.create(req.body);

    if (!compId) res.status(400).send("Could not create new competition");
    else res.json({ compId });
  });

  router.get("/:compId", function (req, res) {
    res.json(req.comp.getInfo());
  });

  router.post("/:compId/register", function (req, res) {
    let playerRes = req.comp.registerNewPlayer(parseInt(req.query.player) || null);

    if (!playerRes) res.status(400).send("Could not register new player");
    else res.json(playerRes);
  });

  return router;
}
