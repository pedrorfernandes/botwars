'use strict';

let Game = require('./game').default;

let _ = require('lodash');
let randomGenerator = require('seedrandom');
let shuffle = require('../utils/shuffle').shuffle;
let sample = require('../utils/shuffle').sample;

// for compatibility lodash 3 <-> 4
let max = _.maxBy || _.max;
let sum = _.sumBy || _.sum;

function Card(rank, suit) {
  return rank + suit;
}

function getSuit(card) {
  return card[1];
}

function getValue(card) {
  return values[card[0]];
}

function getScaledValue(card) {
  return valuesScale[card[0]];
}

function isVisible(card) {
  return card !== null;
}

var values = {
  'A': 11, '7': 10, 'K': 4, 'J': 3, 'Q': 2, '6': 0, '5': 0, '4': 0, '3': 0, '2': 0
};

var valuesScale = {
  'A': 10, '7': 9, 'K': 8, 'J': 7, 'Q': 6, '6': 5, '5': 4, '4': 3, '3': 2, '2': 1
};

var ranks = ['A', '7', 'K', 'J', 'Q', '6', '5', '4', '3', '2'];
var suits = ['♠', '♥', '♦', '♣'];

var startingDeck = suits.reduce(function(deck, suit) {
  return deck.concat(ranks.map(function(rank) {
    return Card(rank, suit);
  }));
}, []);

function copyHands(hand) {
  var newArray = [];
  for (var i = 0; i < hand.length; i++) {
    newArray[i] = hand[i].slice();
  }
  return newArray
}

let teamsPerNumberOfPlayers = {
  2: [[0], [1]],
  4: [[0,2], [1,3]]
};

let cardNumbersPerPlayerNumbers = {
  2: 9,
  4: 6
};

function getNumberOfCardsPerPlayer(numberOfPlayers) {
  return cardNumbersPerPlayerNumbers[numberOfPlayers];
}

class Bisca extends Game {
  constructor(options = {}) {
    super(options);

    if (typeof(options) == this.constructor.name) {
      this._clone(options);
      return;
    }

    let seed = options.seed;
    this.numberOfPlayers = options.numberOfPlayers || 2;
    let numberOfCardsPerPlayer = getNumberOfCardsPerPlayer(this.numberOfPlayers);
    let rng = seed ? randomGenerator(seed) : randomGenerator();
    let initialDeck = shuffle(startingDeck, rng);
    let initialNumberOfDealtCards = numberOfCardsPerPlayer * this.numberOfPlayers;
    let initialHands = initialDeck.slice(0, initialNumberOfDealtCards);
    this.deck = initialDeck.slice(initialNumberOfDealtCards, initialDeck.length);
    this.hands = _.chunk(initialHands, numberOfCardsPerPlayer);
    this.trumpCard = _.last(this.deck);

    if (options.lastGame && options.lastGame.trumpPlayer) {
      this.trumpPlayer = this.getPlayerAfter(options.lastGame.trumpPlayer);
    } else {
      this.trumpPlayer = Math.floor(rng() * this.numberOfPlayers + 1);
    }

    this.trump = getSuit(this.trumpCard);
    this.nextPlayer = this.getPlayerAfter(this.trumpPlayer);
    this.lastTrick = null;
    this.trick = _.range(this.numberOfPlayers).map(() => null);
    this.wonCards = _.range(this.numberOfPlayers).map(() => []);
    this.round = 1;
    this.suitToFollow = null;
    this.hasSuits = _.range(this.numberOfPlayers).map(() => ({ '♠': true, '♥': true, '♦': true, '♣': true }));

    this.score = _.range(this.numberOfPlayers).map(() => 0);
    this.error = false;
    this.winners = null;
  }

  getPlayerCount() { return this.numberOfPlayers; }

  isEnded() {
    return this.error || this.winners !== null;
  }

  isError() { return this.error; }

  getNextPlayer() { return this.nextPlayer; }

  _getCardsInTableCount() {
    return this.trick.reduce((count, card) => card !== null ? count + 1 : count, 0);
  }

  _getTeams() {
    return teamsPerNumberOfPlayers[this.numberOfPlayers];
  }

  static _toPlayer(player) {
    return player + 1;
  }

  static _toPlayerIndex(player) {
    return player - 1;
  }

  getPossibleMoves(playerPerspective) {
    if (playerPerspective && playerPerspective !== this.nextPlayer) {
      return this.getAllPossibilities(playerPerspective);
    }

    let playerIndex = Bisca._toPlayerIndex(this.nextPlayer);
    let hand = this.hands[playerIndex];

    if (hand.indexOf(null) > -1) {
      return this.getAllPossibilities(this.nextPlayer).concat(hand.filter(card => card !== null));
    }

    let playableCards = null;

    let cardsOfSuit = hand.filter(card => getSuit(card) === this.suitToFollow);

    if (this.suitToFollow && this._isMandatoryToFollowSuit() && cardsOfSuit.length > 0) {
      playableCards = cardsOfSuit;
    } else {
      playableCards = hand;
    }

    if (hand.indexOf(null) > -1) {
      return this.getAllPossibilities(this.nextPlayer).concat(playableCards);
    }

    return playableCards;
  }

  isValidMove(player, card) {
    return player === this.nextPlayer
      && this.getPossibleMoves(player).indexOf(card) > -1;
  }

  _putCardInTrick(playerIndex, card) {
    this.trick[playerIndex] = card;
    let hand = this.hands[playerIndex];
    hand.splice(hand.indexOf(card), 1);
  }

  _takeCardFromDeck(playerIndex) {
    this.hands[playerIndex].push(this.deck[0]);
    this.deck.splice(0, 1);
  }

  _takeCardsFromDeck(roundWinnerIndex) {
    let playerIndex = roundWinnerIndex;
    do {
      this._takeCardFromDeck(playerIndex);
      playerIndex = this._getPlayerIndexAfter(playerIndex);
    } while (playerIndex !== roundWinnerIndex);
  }

  move(player, card) {
    let playerIndex = player - 1;

    this._putCardInTrick(playerIndex, card);
    this._updatePlayerHasSuits(playerIndex, card);

    var cardsInTableCount = this._getCardsInTableCount();

    if (cardsInTableCount === this.numberOfPlayers) {
      var highestCard = this.getHighestCard(this.trick, this.suitToFollow);

      var roundWinnerIndex = this.trick.indexOf(highestCard);

      this.wonCards[roundWinnerIndex] = this.wonCards[roundWinnerIndex].concat(this.trick);

      this.previousPlayer = this.nextPlayer;
      this.lastTrick = this.trick;
      this.trick = _.range(this.numberOfPlayers).map(() => null);
      this.nextPlayer = Bisca._toPlayer(roundWinnerIndex);
      this.round += 1;
      this.suitToFollow = null;

      if (this.deck.length > 0) {
        this._takeCardsFromDeck(roundWinnerIndex);
      }

      if (this.deck.length === 0 && _.every(this.hands, hand => hand.length === 0)) {
        this.winners = this.getWinners();
      }

      this.score = this._getTeamScores();

      return;
    }

    if (cardsInTableCount === 1) {
      this.suitToFollow = getSuit(card);
    }

    this.nextPlayer = this.getPlayerAfter(this.nextPlayer);
  }

  performMove(card)  {
    return this.move(this.nextPlayer, card);
  }

  getPlayerAfter(player) {
    return (player % this.numberOfPlayers) + 1;
  }

  _getPlayerIndexAfter(player) {
    return (player + 1) % this.numberOfPlayers;
  }

  getFullState() {
    return _.pick(this, [
      'numberOfPlayers', 'nextPlayer', 'deck', 'hands', 'trumpCard',
      'startingPlayer', 'trump', 'trick', 'lastTrick', 'wonCards', 'round',
      'suitToFollow', 'hasSuits', 'error', 'winners', 'score'
    ]);
  }

  getStateView(fullState, player) {
    let self = this;
    let playerIndex = Bisca._toPlayerIndex(player);
    let hideIfNotTrumpCard = card => card !== self.trumpCard ? null : card;
    let hideHandIfNotPlayer = function(hand, index) {
      return playerIndex === index ? hand : hand.map(hideIfNotTrumpCard);
    };

    return _.assign({}, fullState, {
      deck: fullState.deck.map(hideIfNotTrumpCard),
      hands: fullState.hands.map(hideHandIfNotPlayer),
      hand: fullState.hands[Bisca._toPlayerIndex(player)]
    });
  }

  _clone(game) {
    this.numberOfPlayers = game.numberOfPlayers;
    this.nextPlayer = game.nextPlayer;
    this.deck = game.deck.slice();
    this.hands = copyHands(game.hands);
    this.trick =  game.trick.slice();
    this.trumpCard = game.trumpCard;
    this.trump = game.trump;
    this.wonCards = copyHands(game.wonCards);
    this.round = game.round;
    this.suitToFollow = game.suitToFollow;
    this.startingPlayer = game.startingPlayer;
    this.hasSuits = game.hasSuits.map(function(playerHasSuits) {
      return {
        '♠': playerHasSuits['♠'],
        '♥': playerHasSuits['♥'],
        '♦': playerHasSuits['♦'],
        '♣': playerHasSuits['♣']
      }
    })
  };

  getHighestCard(table, suitToFollow) {
    let trumps = table.filter(card => getSuit(card) === this.trump);

    if (trumps.length > 0) {
      return max(trumps, getScaledValue);
    }

    let followed = table.filter(card => getSuit(card) === suitToFollow);

    return max(followed, getScaledValue);
  }

  _isMandatoryToFollowSuit() {
    return this.deck.length === 0;
  }

  _updatePlayerHasSuits(playerIndex, playedCard) {
    if (this.suitToFollow
      && this.suitToFollow !== getSuit(playedCard)
      && this._isMandatoryToFollowSuit()) {

      this.hasSuits[playerIndex][this.suitToFollow] = false;
    }
  }

  getScore(players) {
    let teamWonCards = players.reduce(
      (cards, player) => cards.concat(this.wonCards[player]), []);

    return sum(teamWonCards, card => getValue(card));
  }

  _getTeamScores() {
    return this._getTeams().map(this.getScore, this);
  }

  getWinners() {
    let teams = this._getTeams();
    let teamScores = this._getTeamScores();

    let maxScore = max(teamScores);

    let winningTeam = teams.filter((team, teamIndex) => teamScores[teamIndex] === maxScore);

    if (winningTeam.length > 1) {
      return null;
    }

    return winningTeam[0].map(Bisca._toPlayer);
  }

  getAllPossibilities(playerPerspective) {
    let playerPerspectiveIndex = Bisca._toPlayerIndex(playerPerspective);
    let playerPerspectiveHand = this.hands[playerPerspectiveIndex];

    let playedCards = _.flatten(this.wonCards);
    let inRoundCards = this.trick.filter(card => card !== null);
    let visibleDeckCards = this.deck.filter(card => card !== null);
    let impossibilities = playerPerspectiveHand.concat(playedCards)
      .concat(inRoundCards).concat(visibleDeckCards);

    let nextPlayerIndex = Bisca._toPlayerIndex(this.nextPlayer);
    let hasSuits = this.hasSuits[nextPlayerIndex];
    return startingDeck.filter(card => {
      let suit = getSuit(card);
      return hasSuits[suit] && !_.includes(impossibilities, card);
    });
  }

  _isInvalidAssignment(hands) {
    if (!hands) { return true; }
    let self = this;

    return _.some(hands, function isInvalid (hand, playerIndex) {

      return _.some(hand, function hasInvalidSuit (card) {
        return self.hasSuits[playerIndex][getSuit(card)] === false;
      });

    });
  }

  _getSeenCards() {
    return _.flatten(this.wonCards)
      .concat(_.flatten(this.hands).filter(isCardVisible))
      .concat(this.trick.filter(isCardVisible))
      .concat(this.deck.filter(isCardVisible));
  }

  _getUnknownCards() {
    return _.difference(startingDeck, this._getSeenCards());
  }

  randomize(rng, player) {
    // if (!_.isUndefined(player)) {
    //   // clear other player hands when game is already visible
    //   var hand = this.hands[player];
    //   this.hands = [[],[],[],[]];
    //   this.hands[player] = hand;
    // }

    let unknownCards = this._getUnknownCards();

    var possibleHands, shuffledUnknownCards;

    do {

      shuffledUnknownCards = shuffle(unknownCards.slice(), rng);

      possibleHands = copyHands(this.hands);

      possibleHands = possibleHands.map(function distributeUnknownCards(hand, playerIndex) {
        let visibleCards = hand.filter(isCardVisible);
        var numberOfCardsToTake = hand.filter(isCardHidden).length;
        return visibleCards.concat(shuffledUnknownCards.splice(0, numberOfCardsToTake));
      }, this);

    } while (this._isInvalidAssignment(possibleHands));

    this.hands = possibleHands;

    this.deck = this.deck.map(card => {
      if (isCardVisible(card)) {
        return card;
      }
      return shuffledUnknownCards.splice(0, 1)[0];
    });

    return this;
  }

  getAllPossibleHands() {
    throw new Error(this.constructor.name + ".getAllPossibleHands not implemented");
  }

  getAllPossibleStates() {
    throw new Error(this.constructor.name + ".getAllPossibleStates not implemented");
  }

  getGameValue() {
    throw new Error(this.constructor.name + ".getGameValue not implemented");
  }

  getPrettyPlayerHand(player) {
    throw new Error(this.constructor.name + ".getPrettyPlayerHand not implemented");
  }
}

export default Bisca;