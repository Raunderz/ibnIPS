% db_connection.erl
% Opening, closing and identifying a database connection.
%
% A connection is either a local SQLite file or a Turso database:
%   {sqlite, Ref}        an esqlite3 handle
%   {turso, Url, Token}  credentials
%
% Both are represented by one Gleam type (db.Connection), so no other module
% has to care which one it holds.

-module(db_connection).

-export([open_sqlite/1, open_turso/2, close/1, is_turso/1, sqlite_ref/1,
         credentials/1]).

%% Local SQLite file, created if missing. Path comes from DB_PATH.
%%
%% Gleam passes strings as UTF-8 binaries, so the path is converted to a
%% charlist before being concatenated with the URI.
open_sqlite(Path) ->
    Uri = "file:" ++ as_charlist(Path) ++ "?mode=rwc",
    case esqlite3:open(Uri) of
        {ok, Ref} ->
            {ok, {sqlite, Ref}};
        {error, Code} ->
            {error, {sqlite_open_failed, Code}}
    end.

as_charlist(Value) when is_binary(Value) -> binary_to_list(Value);
as_charlist(Value) when is_list(Value) -> Value.

%% Turso. Credentials are only checked at boot so a bad token fails there
%% rather than on the first request of the day.
open_turso(Url, Token) ->
    case turso_http:ping(Url, Token) of
        ok -> {ok, {turso, Url, Token}};
        {error, Reason} -> {error, {turso_unreachable, Reason}}
    end.

close({sqlite, Ref}) ->
    _ = esqlite3:close(Ref),
    ok;
close({turso, _Url, _Token}) ->
    %% Nothing to close: every statement is its own short-lived HTTP request.
    ok.

is_turso({turso, _Url, _Token}) -> true;
is_turso({sqlite, _Ref}) -> false.

%% The raw esqlite3 handle, for the local-only helpers in db.gleam.
sqlite_ref({sqlite, Ref}) -> Ref.

%% The Turso URL and token, for db_query.gleam.
credentials({turso, Url, Token}) -> {Url, Token}.