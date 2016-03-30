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
  2: 3,
  4: 3
};

function getNumberOfCardsPerPlayer(numberOfPlayers) {
  return cardNumbersPerPlayerNumbers[numberOfPlayers];
}

class Bisca extends Game {
  constructor(options = {}) {
    super(options);

    if (typeof(options) == this.constructor.name) {
      this._clone(options);
    } else {
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
      this.trick = new Array(this.numberOfPlayers).fill(null);
      this.wonCards = new Array(this.numberOfPlayers).fill([]);
      this.round = 1;
      this.suitToFollow = null;
      this.hasSuits = new Array(this.numberOfPlayers).fill({
        '♠': true, '♥': true, '♦': true, '♣': true
      });

      this.score = new Array(this.numberOfPlayers).fill(0);
      this.error = false;
      this.winners = null;
    }
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
  
  static _playerIndexToPlayer(player) {
    return player + 1;
  }

  getPossibleMoves(playerIndex) {
    let self = this;
    let hand = this.hands[playerIndex];
    let cardsOfSuit = hand.filter(card => getSuit(card) === self.suitToFollow);

    if (this.suitToFollow && this._isMandatoryToFollowSuit() && cardsOfSuit.length > 0) {
      return cardsOfSuit;
    }

    return hand;
  }

  isValidMove(player, card) {
    let playerIndex = player - 1;
    return player === this.nextPlayer
      && this.getPossibleMoves(playerIndex).indexOf(card) > -1;
  }
  
  _putCardInTrick(player, card) {
    this.trick[player] = card;
    let hand = this.hands[player];
    hand.splice(hand.indexOf(card), 1);
  }

  _takeCardFromDeck(playerIndex) {
    this.hands[playerIndex].push(this.deck[0]);
    this.deck.splice(0, 1);
  }

  _takeCardsFromDeck(roundWinner) {
    let playerIndex = roundWinner;
    do {
      this._takeCardFromDeck(playerIndex);
      playerIndex = this._getPlayerIndexAfter(playerIndex);
    } while (playerIndex !== roundWinner);
  }

  performMove(player, card) {
    let playerIndex = player - 1;

    this._putCardInTrick(playerIndex, card);

    this._updatePlayerHasSuits(playerIndex, card);

    var cardsInTableCount = this._getCardsInTableCount();

    if (cardsInTableCount === this.numberOfPlayers) {
      var highestCard = this.getHighestCard(this.trick, this.suitToFollow);

      var roundWinnerPlayerIndex = this.trick.indexOf(highestCard);

      this.wonCards[roundWinnerPlayerIndex] = this.wonCards[roundWinnerPlayerIndex].concat(this.trick);

      this.lastTrick = this.trick;
      this.trick = new Array(this.numberOfPlayers).fill(null);
      this.nextPlayer = roundWinnerPlayerIndex + 1;
      this.round += 1;
      this.suitToFollow = null;

      if (this.deck.length > 0) {
        this._takeCardsFromDeck(roundWinnerPlayerIndex);
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

  move(player, card)  {
    return this.performMove(player, card);
  }

  getPlayerAfter(player) {
    return (player % this.numberOfPlayers) + 1;
  }

  _getPlayerIndexAfter(player) {
    return (player + 1) % this.numberOfPlayers;
  }

  onMoveTimeout() {
    this.winners = Bisca.getTeam(this.getPlayerAfter(this.nextPlayer));
    this.nextPlayer = null;
    return true;
  }
  
  getFullState() {
    return _.pick(this, [
      'numberOfPlayers', 'nextPlayer', 'deck', 'hands', 'trumpCard',
      'trumpPlayer', 'trump', 'trick', 'lastTrick', 'wonCards', 'round',
      'suitToFollow', 'hasSuits', 'error', 'winners', 'score'
      // tricksDone
    ]);
  }

  getStateView(fullState, player) {
    return {
      ...fullState,
      // deck: fullState.deck.map(card => null),
      // hands: fullState.hands.map(hand => hand.map(card => null)),
      hand: fullState.hands[player - 1]
    };
  }

  _clone(game) {
    this.numberOfPlayers = game.numberOfPlayers;
    this.nextPlayer = game.nextPlayer;
    this.deck = game.deck.slice();
    this.hands = copyHands(game.hands);
    this.trick =  game.trick.slice();
    this.trumpCard = game.trumpCard;
    this.trumpPlayer = game.trumpPlayer;
    this.trump = game.trump;
    this.wonCards = copyHands(game.wonCards);
    this.round = game.round;
    this.suitToFollow = game.suitToFollow;
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
    let trump = this.trump;

    let trumps = table.filter(card => getSuit(card) === trump);

    if (trumps.length > 0) {
      return max(trumps, getScaledValue);
    }

    let followed = table.filter(card => getSuit(card) === suitToFollow);

    return max(followed, getScaledValue);
  }

  _isMandatoryToFollowSuit() {
    return this.deck.length === 0;
  }

  _updatePlayerHasSuits(player, playedCard) {
    let playedSuit = getSuit(playedCard);
    if (this.suitToFollow 
      && this.suitToFollow !== playedSuit 
      && this._isMandatoryToFollowSuit()) {
      this.hasSuits[player][this.suitToFollow] = false;
    }
  }

  getScore(players) {
    let self = this;

    let teamWonCards = players.reduce(function getCards(cards, player) {
      return cards.concat(self.wonCards[player]);
    }, []);

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

    return winningTeam[0].map(Bisca._playerIndexToPlayer);
  }

  getAllPossibilities(playerPerspective) {

  }

  _isInvalidAssignment(hands) {

  }

  _getSeenCards() {

  }

  _getUnknownCards() {
  }

  _getRoundStartCardNumber(playerIndex) {

  }

  randomize(rng, player) {
  }

  getAllPossibleHands() {
  }

  getAllPossibleStates() {
  }

  getTeam(player) {
  }

  getGameValue() {}

  getPrettyPlayerHand(player) {
  }
}

export default Bisca;
