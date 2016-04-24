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

function getSuitString(card) {
  if (card) {
    return suitMap[card[1]];
  }
  return null;
}

function getSuit(card) {
  if (card) {
    return card[1];
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
    case "1": return "rank10";
    case null: return "";
    default: return `rank${value}`;
  }
}

function cardCompare(cardA, cardB) {
  return cardOrder(cardA) - cardOrder(cardB);
}

function cardOrder(card) {
  let value = getValue(card);
  let suit = getSuit(card);

  let suitOrder = ["♠", "♥", "♣", "♦"].indexOf(suit) + 1;
  let valueOrder = ["2", "3", "4", "5", "6", "9", "8", "1", "Q", "J", "K", "7", "A"].indexOf(value) + 1;

  return suitOrder * 100 + valueOrder;
}

class Card extends React.Component {

  render() {
    let { card, top, left, zIndex, onClick, ...props } = this.props;
    let cardClasses = "card " + (card ? ` ${getSuitString(card)} ${getRankClass(card)}` : "");
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

const Hand = ({ player, nextPlayer, cards, cardCount, deltaX = 40, deltaY = 35,
    deltaCx = 2, deltaCy = 3.6, onCardClick, rot }) => {

  let info = playerInfo[((player - 1) + rot) % 4];
  let x = 50 + info.x * deltaX - info.y * deltaCx * 4.5;
  let y = 50 + info.y * deltaY - info.x * deltaCy * 4.5;

  let sortedCards = cards ? cards.sort(cardCompare) : {};

  let cardElems = [];
  for (let i = 0; i < cardCount; i++) {
    let z = info.x === -1 || info.y === -1 ? cardCount - i : i;
    cardElems.push(<Card card={sortedCards[i]} top={y} left={x} zIndex={z} key={`card${i}`}
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

const Hands = ({ nextPlayer, hands, currentTrick, rot, onCardClick }) => {
  if (!currentTrick) return <div className="hands" />;

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

const Scoreboard = ({ score }) => (
    <div className="scoreboard">
      <span>Score</span>
      <br />
      <span><span className="player-chip inline team1" />Team 1: {score ? score[0] : "-"}</span>
      <br />
      <span><span className="player-chip inline team2" />Team 2: {score ? score[1] : "-"}</span>
    </div>
);

const Sueca = ({ player, gameState, isLastState, onMove }) => {
  let { trumpPlayer, nextPlayer, hands, hand, trick, lastTrick, tricksDone,
      trumpCard, score } = gameState || {};

  let rot = player ? (5 - player) % 4 : 0;
  let onCardClick = isLastState && player === nextPlayer ? onMove : null;

  return (
      <Row className="flex">
        <Col lg={12} className="flex">
          <div id="sueca" className="flex">
            <div className="deck flex">
              <CurrentTrick cards={trick} lastTrickCards={lastTrick} rot={rot} />
              <Hands player={player} nextPlayer={nextPlayer} handCards={hand}
                     hands={hands} tricksDone={tricksDone} currentTrick={trick}
                     rot={rot} onCardClick={onCardClick} />
              <Trump card={trumpCard} player={trumpPlayer} />
              <LastTrick cards={lastTrick} rot={rot} />
              <Scoreboard score={score} />
            </div>
          </div>
        </Col>
      </Row>);
};

export default Sueca;
