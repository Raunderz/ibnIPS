-module(file_ffi).
-export([read_file/1]).

read_file(Path) ->
    case file:read_file(unicode:characters_to_list(Path)) of
        {ok, Binary} -> {ok, binary_to_list(Binary)};
        {error, Reason} -> {error, iolist_to_binary(io_lib:format("~p", [Reason]))}
    end.
