-module(hash_ffi).
-export([hash_code/1]).

%% SHA-256 of a UTF-8 access code, lower-case hex.
%%
%% This digest has to match, byte for byte, what the Civet auth service stores
%% in `auth_identities.code_hash` (`createHash('sha256').update(raw,'utf8')
%% .digest('hex')`). If the two disagree in casing or encoding, every valid code
%% is simply not found and login looks broken rather than wrong.
%%
%% The hex is encoded here rather than by asking crypto for it, because
%% `crypto:hash/3` (which took an encoding) was removed in OTP 28 and this
%% project builds against a range of releases. The digest is 32 bytes, so
%% formatting it a byte at a time costs nothing worth saving.
%%
%% The result is a binary, not a list of characters: Gleam compiles its string
%% literals to binaries on the Erlang target, so returning a charlist here would
%% not compare equal to a string literal despite holding the same characters.
%%
%% Done in Erlang because gleam/bit_array has no hex encoder, so expressing it
%% in Gleam would mean hand-rolling an encode that has to be right.
hash_code(Code) ->
    Digest = crypto:hash(sha256, unicode:characters_to_binary(Code)),
    iolist_to_binary([io_lib:format("~2.16.0b", [Byte]) || <<Byte>> <= Digest]).