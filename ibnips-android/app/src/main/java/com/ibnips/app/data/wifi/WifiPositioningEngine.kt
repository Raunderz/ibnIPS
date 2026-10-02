package com.ibnips.app.data.wifi

import com.ibnips.app.data.model.WifiFingerprint
import com.ibnips.app.data.model.WifiFingerprintSample
import kotlin.math.abs

class WifiPositioningEngine(private val confidenceThreshold: Float = 0.60f) {

    fun findBestMatch(
        currentScan: List<WifiScanResult>,
        fingerprints: List<WifiFingerprint>
    ): MatchResult? {
        if (currentScan.isEmpty() || fingerprints.isEmpty()) return null

        val results = fingerprints.map { fingerprint ->
            val score = calculateLocationScore(currentScan, fingerprint)
            LocationMatch(fingerprint, score)
        }.sortedByDescending { it.score }

        val best = results.firstOrNull() ?: return null

        return MatchResult(
            fingerprint = best.fingerprint,
            score = best.score,
            isConfident = best.score >= confidenceThreshold,
            matchedBssidsCount = countMatches(currentScan, best.fingerprint)
        )
    }

    private fun calculateLocationScore(currentScan: List<WifiScanResult>, fingerprint: WifiFingerprint): Float {
        // Compare current scan against all samples and take the best score
        val sampleScores = fingerprint.samples.map { sample ->
            calculateSampleSimilarity(currentScan, sample)
        }
        return sampleScores.maxOrNull() ?: 0f
    }

    private fun calculateSampleSimilarity(currentScan: List<WifiScanResult>, sample: WifiFingerprintSample): Float {
        val currentMap = currentScan.associateBy { it.bssid }
        val sampleMap = sample.networks.associateBy { it.bssid }

        val commonBssids = currentMap.keys.intersect(sampleMap.keys)
        if (commonBssids.isEmpty()) return 0f

        // Overlap score: how many BSSIDs match out of total unique BSSIDs in both
        val allBssids = currentMap.keys.union(sampleMap.keys)
        val overlapScore = commonBssids.size.toFloat() / allBssids.size.toFloat()

        // RSSI similarity score
        var rssiSimilaritySum = 0f
        for (bssid in commonBssids) {
            val currentRssi = currentMap[bssid]!!.rssi
            val sampleRssi = sampleMap[bssid]!!.rssi
            val diff = abs(currentRssi - sampleRssi)
            // 0 diff -> 1.0 similarity, 40+ diff -> 0.0 similarity
            val similarity = (1f - (diff.toFloat() / 40f)).coerceIn(0f, 1f)
            rssiSimilaritySum += similarity
        }
        val avgRssiSimilarity = rssiSimilaritySum / commonBssids.size

        // Combined score: weighted average of overlap and RSSI similarity
        return (overlapScore * 0.4f) + (avgRssiSimilarity * 0.6f)
    }

    private fun countMatches(currentScan: List<WifiScanResult>, fingerprint: WifiFingerprint): Int {
        val currentBssids = currentScan.map { it.bssid }.toSet()
        val fingerprintBssids = fingerprint.samples.flatMap { s -> s.networks.map { it.bssid } }.toSet()
        return currentBssids.intersect(fingerprintBssids).size
    }

    data class LocationMatch(val fingerprint: WifiFingerprint, val score: Float)
    
    data class MatchResult(
        val fingerprint: WifiFingerprint,
        val score: Float,
        val isConfident: Boolean,
        val matchedBssidsCount: Int
    )
}
