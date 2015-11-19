import AppDispatcher from "../AppDispatcher";
import CompsEvents from "../events/CompsEvents";
import request from "superagent";

let CompsActions = {

  retrieveCompInfo: function (gameHref, compId) {
    request.get(`/api${gameHref}/competitions/${compId}`)
        .set("Accept", "application/json")
        .end(function (err, res) {
          AppDispatcher.dispatch({
            actionType: err ? CompsEvents.COMP_INFO_ERROR : CompsEvents.COMP_INFO,
            gameHref: gameHref,
            competition: err || res.body
          });
        });
  },

  retrieveCompsList: function (gameHref) {
    request.get(`/api${gameHref}/competitions`)
        .set("Accept", "application/json")
        .end(function (err, res) {
          AppDispatcher.dispatch({
            actionType: err ? CompsEvents.COMPS_LIST_ERROR : CompsEvents.COMPS_LIST,
            gameHref: gameHref,
            competitions: err || res.body
          });
        });
  },

  register: function (gameHref, compId) {
    request.post(`/api${gameHref}/competitions/${compId}/register`)
        .set("Accept", "application/json")
        .end(function (err, res) {
          AppDispatcher.dispatch({
            actionType: err ? CompsEvents.REGISTER_ERROR : CompsEvents.REGISTER_SUCCESS,
            gameHref: gameHref,
            compId: compId,
            data: err || res.body
          });
        });
  }
};

export default CompsActions;