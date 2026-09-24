-module(map_ffi).
-export([fetch_url/1]).

fetch_url(Url) when is_binary(Url) ->
    fetch_url(binary_to_list(Url));
fetch_url(Url) when is_list(Url) ->
    _ = application:ensure_all_started(inets),
    _ = application:ensure_all_started(ssl),
    % Some CDNs (e.g. files.catbox.moe) close the socket if User-Agent is missing.
    Headers = [{"User-Agent", "ibnIPS/1.0"}, {"Accept", "application/json"}],
    HttpOpts = [{timeout, 10000}, {connect_timeout, 5000}],
    Opts = [{body_format, binary}],
    case httpc:request(get, {Url, Headers}, HttpOpts, Opts) of
        {ok, {{_Version, 200, _Reason}, _Headers, Body}} ->
            {ok, Body};
        {ok, {{_Version, Status, _Reason}, _Headers, _Body}} ->
            {error, iolist_to_binary(io_lib:format("http_status_~p", [Status]))};
        {error, Reason} ->
            {error, iolist_to_binary(io_lib:format("~p", [Reason]))}
    end.
