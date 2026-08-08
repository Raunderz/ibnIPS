-module(app_auth_ffi).
-export([put_token/2, get_token/1, init_table/0]).

init_table() ->
    ets:new(auth_tokens, [named_table, public, set]),
    nil.

put_token(Token, Email) ->
    ets:insert(auth_tokens, {Token, Email}),
    nil.

get_token(Token) ->
    case ets:lookup(auth_tokens, Token) of
        [{_, Email}] -> {ok, Email};
        [] -> {error, nil}
    end.
