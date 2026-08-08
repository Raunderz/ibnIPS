-module(app_auth_ffi).
-export([put_token/2, get_token/1]).

put_token(Token, Email) ->
    erlang:put({auth_token, Token}, Email),
    nil.

get_token(Token) ->
    case erlang:get({auth_token, Token}) of
        undefined -> {error, nil};
        Email -> {ok, Email}
    end.
