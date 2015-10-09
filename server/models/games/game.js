class Game {
  // constructor(params)
  constructor() {
    if (this.constructor === Game) {
      throw new TypeError("Cannot construct Game instances directly");
    }
  }

  getPlayerCount() {
    throw new Error(this.constructor + ".getPlayerCount not implemented");
  }

  isEnded() {
    throw new Error(this.constructor + ".isEnded not implemented");
  }

  isError() {
    throw new Error(this.constructor + ".isError not implemented");
  }

  getWinner() {
    throw new Error(this.constructor + ".getWinner not implemented");
  }

  getNextPlayer() {
    throw new Error(this.constructor + ".getCurrentPlayer not implemented");
  }

  // isValidMove(player, move)
  isValidMove() {
    throw new Error(this.constructor + ".isValidMove not implemented");
  }

  // move(player, move)
  move() {
    throw new Error(this.constructor + ".move not implemented");
  }

  getFullState() {
    throw new Error(this.constructor + ".getFullState not implemented");
  }

  // getStateView(fullState, player)
  getStateView() {
    throw new Error(this.constructor + ".getStateView not implemented");
  }

  // getState(player)
  getState(player) {
    return this.getStateView(this.getFullState(), player);
  }
}

export default Game;
