%% Local SQLite access via esqlite3.
%%
%% Only used when the backend runs against a local file rather than Turso.
%% The connection is a {sqlite, Ref} tuple (see db_connection.erl), unwrapped
%% here so nothing above this module has to know about it.

-module(db_query_ffi).

-export([query_as_maps/3, to_dynamic/1, exec_with_args/3]).

%% Run a SELECT and return each row as a map of column name -> value.
query_as_maps(Sql, {sqlite, Ref}, Arguments) ->
    query_as_maps(Sql, Ref, Arguments);
query_as_maps(Sql, Connection, Arguments) ->
    case esqlite3:prepare(Connection, unicode:characters_to_list(Sql)) of
        {error, _} ->
            {error, {db_error, errmsg(Connection)}};
        {ok, Stmt} ->
            ColumnNames = esqlite3:column_names(Stmt),
            case esqlite3:q(Connection, Sql, Arguments) of
                {error, _} ->
                    {error, {db_error, errmsg(Connection)}};
                Rows ->
                    {ok, [
                        maps:from_list(lists:zip(
                            [column_name(C) || C <- ColumnNames],
                            Row
                        ))
                        || Row <- Rows
                    ]}
            end
    end.

to_dynamic(X) -> X.

column_name(Name) when is_binary(Name) -> Name;
column_name(Name) when is_atom(Name) -> atom_to_binary(Name, utf8);
column_name(Name) when is_list(Name) -> unicode:characters_to_binary(Name);
column_name(Name) -> iolist_to_binary(Name).

%% Run a write statement (INSERT/UPDATE/DELETE).
%%
%% A statement that fails must report it. Reporting success for a failed write
%% is worse than useless: the caller goes on to record data that was never
%% stored.
exec_with_args(Sql, {sqlite, Ref}, Arguments) ->
    exec_with_args(Sql, Ref, Arguments);
exec_with_args(Sql, Connection, Arguments) ->
    case esqlite3:prepare(Connection, unicode:characters_to_list(Sql)) of
        {error, _} ->
            {error, {db_error, errmsg(Connection)}};
        {ok, Stmt} ->
            try esqlite3:bind(Stmt, Arguments) of
                ok ->
                    case esqlite3:step(Stmt) of
                        '$done' ->
                            {ok, nil};
                        {error, _} ->
                            {error, {db_error, errmsg(Connection)}};
                        Other ->
                            Msg = iolist_to_binary(
                                io_lib:format("unexpected step result: ~p", [Other])
                            ),
                            {error, {db_error, Msg}}
                    end;
                {error, _} ->
                    {error, {db_error, errmsg(Connection)}}
            catch
                error:Reason ->
                    {error, {db_error, iolist_to_binary(
                        io_lib:format("~p", [Reason]))}}
            end
    end.

%% The human-readable message for whatever went wrong on this connection.
errmsg(Connection) ->
    Info = esqlite3:error_info(Connection),
    maps:get(errmsg, Info, <<>>).