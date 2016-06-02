let _ = require('lodash');

class Game {
  constructor({ name, ...params } = {}) {
    if (this.constructor === Game) {
      throw new TypeError("Cannot construct Game instances directly");
    }
    this.name = name;
    this.params = params;
    this.gameClass = this.constructor.name;
  }

  getName() {
    return this.name;
  }

  getParams() {
    return this.params;
  }

  getPlayerCount() {
    throw new Error(this.constructor.name + ".getPlayerCount not implemented");
  }

  isEnded() {
    throw new Error(this.constructor.name + ".isEnded not implemented");
  }

  isError() {
    throw new Error(this.constructor.name + ".isError not implemented");
  }

  getWinners() {
    throw new Error(this.constructor.name + ".getWinners not implemented");
  }

  getNextPlayer() {
    throw new Error(this.constructor.name + ".getCurrentPlayer not implemented");
  }

  // isValidMove(player, move)
  isValidMove() {
    throw new Error(this.constructor.name + ".isValidMove not implemented");
  }

  // move(player, move, moveTime)
  move() {
    throw new Error(this.constructor.name + ".move not implemented");
  }

  getMoveTimeLimit() {
    return this.params.moveTimeLimit;
  }

  onMoveTimeout() {
    throw new Error(this.constructor.name + ".onMoveTimeout not implemented");
  }

  getFullState() {
    throw new Error(this.constructor.name + ".getFullState not implemented");
  }

  // getStateView(fullState, player)
  getStateView() {
    throw new Error(this.constructor.name + ".getStateView not implemented");
  }

  isCheatingPlayer(player) {
    if (Array.isArray(this.params.cheatingPlayers)) {
      return this.params.cheatingPlayers.indexOf(player) > -1;
    }
    return false;
  }

  // getState(player)
  getState(player) {
    if (_.isUndefined(player) || this.isCheatingPlayer(player)) {
      return this.getFullState();
    }
    return this.getStateView(this.getFullState(), player);
  }
}

export default Game;
