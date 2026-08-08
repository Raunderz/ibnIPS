-module(env_ffi).
-export([get_env/1]).

get_env(Key) when is_list(Key) ->
    case os:getenv(Key) of
        false -> {error, nil};
        Value -> {ok, list_to_binary(Value)}
    end;
get_env(Key) ->
    get_env(binary_to_list(Key)).