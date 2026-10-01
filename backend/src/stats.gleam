// stats.gleam
// Running mean and spread of a set of signal readings, kept as three numbers
// instead of every reading ever taken.
//
// This is Welford's online algorithm. It gives the exact same mean and spread
// as storing every reading and averaging at the end, but uses constant space
// and one pass, which is what lets a room hold thousands of walks' worth of
// Wi-Fi readings in a single row.
//
// The stored sum is `m2`: the sum of squared differences between each reading
// and the mean. Variance is `m2 / n`, and the spread used for matching is its
// square root.
//
// Example — three readings of -55, -60 and -70 dBm end up as n=3,
// mean=-61.67, m2=108.33, so the spread is about 6 dBm.

import gleam/float
import gleam/int

/// The running summary of a set of readings.
pub type Summary {
  Summary(
    n: Int,
    // how many readings went in
    mean: Float,
    // average of the readings
    m2: Float,
    // sum of squared differences from the mean
  )
}

/// A summary of no readings. The natural starting point for a new room.
pub const empty: Summary = Summary(n: 0, mean: 0.0, m2: 0.0)

/// Add one reading to a summary and return the new summary.
///
/// Adding the first reading leaves the spread at zero, because one reading
/// cannot say anything about how much the signal usually moves.
pub fn add(summary: Summary, reading: Float) -> Summary {
  let n = summary.n + 1
  let difference = reading -. summary.mean
  let mean = summary.mean +. difference /. int.to_float(n)
  let m2 = summary.m2 +. difference *. { reading -. mean }
  Summary(n: n, mean: mean, m2: m2)
}

/// Add every reading in a list, in order.
pub fn add_all(readings: List(Float)) -> Summary {
  add_all_from(empty, readings)
}

fn add_all_from(summary: Summary, readings: List(Float)) -> Summary {
  case readings {
    [] -> summary
    [reading, ..rest] -> add_all_from(add(summary, reading), rest)
  }
}

/// How much the readings spread out, in dBm. Returns 0 for fewer than two
/// readings, since one reading has no spread.
pub fn spread(summary: Summary) -> Float {
  case summary.n < 2 {
    True -> 0.0
    False ->
      case float.square_root(summary.m2 /. int.to_float(summary.n)) {
        Ok(value) -> value
        Error(_) -> 0.0
      }
  }
}
