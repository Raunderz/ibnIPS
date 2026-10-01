% turso.erl
% HTTP call for Turso's pipeline API.
%
% Deliberately tiny: just enough Erlang to POST a JSON body and hand back the
% response. Building and parsing the JSON happens in Gleam (turso.gleam) using
% the gleam_json already in the dependency list, so there is no hand-rolled
% parser to get wrong.

-module(turso_http).

-export([post/3, ping/2, classify/1, to_string/1, to_integer/1, to_float/1]).

%% POST `Body' to the pipeline endpoint: {ok, ResponseBody} or {error, Message}.
post(Url0, Token, Body) ->
    %% Gleam strings arrive as binaries, so normalise both before matching.
    Url = https_url(as_charlist(Url0)),
    _ = application:ensure_all_started(inets),
    _ = application:ensure_all_started(ssl),

    %% httpc wants header names and values as char lists. Gleam strings arrive as
%% binaries, but accept a list too so the function is not fussy.
    Headers = [
        {"Authorization", "Bearer " ++ as_charlist(Token)},
        {"Content-Type", "application/json"}
    ],
    %% httpc takes two option lists: request options (timeouts) in the third
%% argument, and client options (body_format) in the fourth.
    HttpOptions = [{timeout, 15000}, {connect_timeout, 10000}],
    ClientOptions = [{body_format, binary}],
    Request = {Url, Headers, "application/json", Body},

    case httpc:request(post, Request, HttpOptions, ClientOptions) of
        {ok, {{_V, 200, _R}, _H, ResponseBody}} ->
            {ok, ResponseBody};
        {ok, {{_V, Status, _R}, _H, ResponseBody}} ->
            {error, iolist_to_binary(
                io_lib:format("HTTP ~p: ~s", [Status, shorten(ResponseBody)]))};
        {error, Reason} ->
            {error, iolist_to_binary(io_lib:format("~p", [Reason]))}
    end.

as_charlist(Value) when is_binary(Value) -> binary_to_list(Value);
as_charlist(Value) when is_list(Value) -> Value.

%% Turso hands out "libsql://host" and the newer "libsql:host". Both have to
%% become https, and the pipeline endpoint lives at /v2/pipeline.
https_url("libsql://" ++ Rest) -> endpoint("https://" ++ Rest);
https_url("libsql:" ++ Rest) -> endpoint("https://" ++ Rest);
https_url("https://" ++ _ = Url) -> endpoint(Url);
https_url("http://" ++ _ = Url) -> endpoint(Url);
https_url(Other) -> endpoint("https://" ++ Other).

%% Add the pipeline path, unless the URL already carries one.
endpoint(Url) ->
  case string:find(Url, "/v2/") of
    nomatch -> string:trim(Url, trailing, "/") ++ "/v2/pipeline";
    _ -> Url
  end.

%% Keep an error readable rather than dumping a whole HTML error page.
shorten(Bin) when is_binary(Bin), byte_size(Bin) > 300 -> binary:part(Bin, 0, 300);
shorten(Other) -> Other.

%% Check the database is reachable and the token works. Used at boot.
ping(Url, Token) ->
    case post(Url, Token, <<"{\"requests\":[{\"type\":\"close\"}]}">>) of
        {ok, _} -> ok;
        {error, Reason} -> {error, Reason}
    end.

%% --- Reading sqlight values ---
%%
%% sqlight.Value is opaque in Gleam, but on Erlang it is the plain term, because
%% sqlight's coerce_value/1 is the identity. So a text argument is a binary and
%% an integer argument is an integer, and these say which.

classify(Value) when is_binary(Value) -> {ok, <<"text">>};
classify(Value) when is_integer(Value) -> {ok, <<"integer">>};
classify(Value) when is_float(Value) -> {ok, <<"float">>};
classify(_) -> {ok, <<"null">>}.

to_string(Value) when is_binary(Value) -> Value;
to_string(Value) when is_list(Value) -> unicode:characters_to_binary(Value);
to_string(Value) -> unicode:characters_to_binary(io_lib:format("~p", [Value])).

to_integer(Value) when is_integer(Value) -> integer_to_binary(Value);
to_integer(Value) when is_float(Value) -> integer_to_binary(trunc(Value));
to_integer(Value) when is_binary(Value) -> Value;
to_integer(_) -> <<"0">>.

to_float(Value) when is_float(Value) -> Value;
to_float(Value) when is_integer(Value) -> float(Value);
to_float(_) -> 0.0.