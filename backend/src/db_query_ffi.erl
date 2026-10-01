-module(db_query_ffi).
-export([query_as_maps/3, to_dynamic/1, exec_with_args/3]).

query_as_maps(Sql, Connection, Arguments) ->
    case esqlite3:prepare(Connection, unicode:characters_to_list(Sql)) of
        {error, _} ->
            Info = esqlite3:error_info(Connection),
            Msg = maps:get(errmsg, Info, <<>>),
            {error, {db_error, Msg}};
        {ok, Stmt} ->
            ColumnNames = esqlite3:column_names(Stmt),
            case esqlite3:q(Connection, Sql, Arguments) of
                {error, _} ->
                    Info = esqlite3:error_info(Connection),
                    Msg = maps:get(errmsg, Info, <<>>),
                    {error, {db_error, Msg}};
                Rows ->
                    MappedRows = lists:map(
                        fun(Row) ->
                            maps:from_list(lists:zip(
                                [to_bin(C) || C <- ColumnNames],
                                Row
                            ))
                        end,
                        Rows
                    ),
                    {ok, MappedRows}
            end
    end.

to_dynamic(X) -> X.

to_bin(C) when is_atom(C) -> atom_to_binary(C, utf8);
to_bin(C) when is_binary(C) -> C.

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
                                io_lib:format("unexpected step result: ~p", [Other])),
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
