import React from "react";
import { Col, Row } from "react-bootstrap";

import _ from "underscore";

const playerInfo = [
  { x: 0, y: 1, labelTop: 90, labelLeft: 32 },
  { x: 1, y: 0, labelTop: 70, labelLeft: 82 },
  { x: 0, y: -1, labelTop: 7.5, labelLeft: 68 },
  { x: -1, y: 0, labelTop: 30, labelLeft: 18 }
];

const suitMap = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  "♠": "spades",
  "♥": "hearts",
  "♦": "diamonds",
  "♣": "clubs"
};

function getSuit(card) {
  if (card) {
    return suitMap[card[1]];
  }
  return null;
}

function getValue(card) {
  if (card) {
    return card[0];
  }
  return null;
}

function getRankClass(card) {
  let value = getValue(card);
  switch (value) {
    case "A": return "rank1";
    case "K": return "rank13";
    case "Q": return "rank12";
    case "J": return "rank11";
    default: return `rank${value}`;
  }
}

class Card extends React.Component {

  getRankClass(value) {
    switch (value) {
      case "A": return "rank1";
      case "K": return "rank13";
      case "Q": return "rank12";
      case "J": return "rank11";
      default: return `rank${value}`;
    }
  }

  render() {
    let { card, top, left, zIndex, onClick, ...props } = this.props;
    let cardClasses = "card " + (card ? `${getSuit(card)} ${getRankClass(card)}` : "");
    return (
      <div className={cardClasses} style={{ top: `${top}%`, left: `${left}%`, zIndex }}
           onClick={onClick ? () => onClick(card) : null} {...props}>
        <div className={ card ? "face" : "back" }></div>
      </div>
    );
  }
}

const CurrentTrick = ({ cards, lastTrickCards, delta = 10, rot }) => {
  if (!cards) return <div className="curr-trick" />;

  if (_(cards).every(c => c == null) && lastTrickCards)
    cards = lastTrickCards;

  let cardElems = [];
  for (let i = 0; i < 4; i++) {
    if (!cards[i]) continue;
    let pi = (i + rot) % 4;
    cardElems.push(<Card card={cards[i]} key={`trick${i}`} zIndex={10 + i}
                         top={50 + playerInfo[pi].y * delta}
                         left={50 + playerInfo[pi].x * delta} />);
  }

  return (
    <div className="curr-trick">
      {cardElems}
    </div>
  );
};

const PlayerLabel = ({ player, nextPlayer, top, left }) => {
  let team = player % 2 ? 1 : 2;
  let isCurrentPlayer = player === nextPlayer;
  return (
    <div className={`player-chip team${team} ${isCurrentPlayer ? "current-player" : ""}`}
         style={{ top: `${top}%`, left: `${left}%` }}>{player}</div>
  );
};

function cardIndex(card) {
  let value = getValue(card);
  switch (value) {
    case "A": return 10;
    case "7": return 9;
    case "K": return 8;
    case "J": return 7;
    case "Q": return 6;
    default: return parseInt(value) - 1;
  }
}

const Hand = ({ player, nextPlayer, cards, cardCount, deltaX = 40, deltaY = 35,
  deltaCx = 2, deltaCy = 3.6, onCardClick, rot }) => {

  let info = playerInfo[((player - 1) + rot) % 4];
  let x = 50 + info.x * deltaX - info.y * deltaCx * 4.5;
  let y = 50 + info.y * deltaY - info.x * deltaCy * 4.5;

  function cardCompare(card1, card2) {
    let card1Suit = getSuit(card1), card2Suit = getSuit(card2);
    if (card1Suit !== card2Suit) return card1Suit < card2Suit ? -1 : 1;
    return cardIndex(card1) - cardIndex(card2);
  }

  let sortedCards = cards ? cards.sort(cardCompare) : {};

  let cardElems = [];
  for (let i = 0; i < cardCount; i++) {
    cardElems.push(<Card card={sortedCards[i]} top={y} left={x} zIndex={i} key={`card${i}`}
                         onClick={onCardClick} />);
    x += info.y * deltaCx;
    y += info.x * deltaCy;
  }

  return (
    <div className={`hand ${onCardClick ? "playable-hand" : ""}`}>
      <PlayerLabel player={player} nextPlayer={nextPlayer}
                   top={info.labelTop} left={info.labelLeft} />
      {cardElems}
    </div>
  );
};

const Hands = ({ player, nextPlayer, handCards, hands, trick, rot, onCardClick }) => {
  if (!trick) return <div className="hands" />;

  let handComponents = hands.map((hand, playerIndex) => {
    return <Hand player={playerIndex + 1} nextPlayer={nextPlayer} cards={hand}
                 cardCount={hand.length} key={`hand${playerIndex}`} rot={rot}
                 onCardClick={onCardClick ? card => onCardClick(card, playerIndex) : null} />
  });

  return (
    <div className="hands">
      {handComponents}
    </div>
  );
};

const Trump = ({ card, player }) => {
  if (!card) return <div className="trump" />;

  return (
    <div className="trump">
      <span>Trump (player {player || "-"})</span><br />
      <Card card={card} top={250} left={50} zIndex={10} />
    </div>
  );
};

const LastTrick = ({ cards, x = 10, y = 85, delta = 5, rot }) => {
  if (!cards) cards = [];

  let cardElems = cards.map((c, i) => {
    let pi = (i + rot) % 4;
    return <Card card={c} key={`trick${i}`} zIndex={10 + i}
                 top={y + playerInfo[pi].y * delta} left={x + playerInfo[pi].x * delta} />;
  });

  return (
    <div className="last-trick">
      {cardElems}
    </div>
  );
};

const Scoreboard = ({ score, deck = [] }) => (
  <div className="scoreboard">
    <span>Score</span>
    <br />
    <span><span className="player-chip inline team1" />Team 1: {score ? score[0] : "-"}</span>
    <br />
    <span><span className="player-chip inline team2" />Team 2: {score ? score[1] : "-"}</span>
    <br />
    <span>Deck size: {deck.length}</span>
  </div>
);

const Bisca = ({ player, gameState, isLastState, onMove }) => {
  let { nextPlayer, hand, hands, trick, lastTrick, trumpCard,
    trumpPlayer, score, deck } = gameState || {};
  
  let rot = player ? (5 - player) % 4 : 0;
  let onCardClick = isLastState && player === nextPlayer ? onMove : null;

  return (
    <Row className="flex">
      <Col lg={12} className="flex">
        <div id="sueca" className="flex">
          <div className="deck flex">
            <CurrentTrick cards={trick} lastTrickCards={lastTrick} rot={rot} />
            <Hands player={player} nextPlayer={nextPlayer} handCards={hand}
                   hands={hands} trick={trick} rot={rot}
                   onCardClick={onCardClick} />
            <Trump card={trumpCard} player={trumpPlayer} />
            <LastTrick cards={lastTrick} rot={rot} />
            <Scoreboard score={score} deck={deck} />
          </div>
        </div>
      </Col>
    </Row>
  );
};

export default Bisca;
