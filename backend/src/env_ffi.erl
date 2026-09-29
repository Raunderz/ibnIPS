-module(env_ffi).
-export([get_env/1]).

get_env(Key) when is_binary(Key) ->
    get_env(binary_to_list(Key));
get_env(Key) when is_list(Key) ->
    case os:getenv(Key) of
        false -> dotenv_get(Key);
        "" -> dotenv_get(Key);
        Value -> {ok, list_to_binary(Value)}
    end.

%% Fall back to a local .env file when the OS env var is unset/empty.
dotenv_get(Key) ->
    case file:read_file(".env") of
        {ok, Bin} ->
            case find_key(Bin, list_to_binary(Key)) of
                {ok, Value} -> {ok, Value};
                error -> {error, nil}
            end;
        _ ->
            {error, nil}
    end.

find_key(Bin, Key) ->
    Lines = binary:split(Bin, <<"\n">>, [global]),
    find_key_lines(Lines, Key).

find_key_lines([], _Key) ->
    error;
find_key_lines([Line | Rest], Key) ->
    Trimmed = trim(Line),
    case Trimmed of
        <<>> -> find_key_lines(Rest, Key);
        <<"#", _/binary>> -> find_key_lines(Rest, Key);
        _ ->
            case binary:split(Trimmed, <<"=">>) of
                [K, V] ->
                    case trim(K) of
                        Key -> {ok, strip_quotes(trim(V))};
                        _ -> find_key_lines(Rest, Key)
                    end;
                _ ->
                    find_key_lines(Rest, Key)
            end
    end.

trim(Bin) ->
    string:trim(Bin).

strip_quotes(<<$", Rest/binary>>) ->
    case byte_size(Rest) of
        0 -> <<>>;
        N ->
            case binary:last(Rest) of
                $" -> binary:part(Rest, 0, N - 1);
                _ -> Rest
            end
    end;
strip_quotes(<<$', Rest/binary>>) ->
    case byte_size(Rest) of
        0 -> <<>>;
        N ->
            case binary:last(Rest) of
                $' -> binary:part(Rest, 0, N - 1);
                _ -> Rest
            end
    end;
strip_quotes(V) ->
    V.
