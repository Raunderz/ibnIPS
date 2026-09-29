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
            Info = esqlite3:error_info(Connection),
            Msg = maps:get(errmsg, Info, <<>>),
            {error, {db_error, Msg}};
        {ok, Stmt} ->
            try esqlite3:bind(Stmt, Arguments) of
                ok ->
                    try esqlite3:step(Stmt) of
                        '$done' -> {ok, nil};
                        _ -> {ok, nil}
                    catch
                        _:_ ->
                            Info = esqlite3:error_info(Connection),
                            Msg = maps:get(errmsg, Info, <<>>),
                            {error, {db_error, Msg}}
                    end;
                {error, _} ->
                    Info = esqlite3:error_info(Connection),
                    Msg = maps:get(errmsg, Info, <<>>),
                    {error, {db_error, Msg}}
            catch
                error:Reason ->
                    Msg = iolist_to_binary(io_lib:format("~p", [Reason])),
                    {error, {db_error, Msg}}
            end
    end.
