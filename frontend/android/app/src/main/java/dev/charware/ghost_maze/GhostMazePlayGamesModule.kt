package dev.charware.ghost_maze

import android.app.Activity
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.gms.games.PlayGames

class GhostMazePlayGamesModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "GhostMazePlayGames"

    private fun getActivityOrNull(): Activity? {
        val activity = reactApplicationContext.currentActivity
        return if (activity is Activity) activity else null
    }

    @ReactMethod
    fun isConfigured(promise: Promise) {
        promise.resolve(hasProjectId())
    }

    @ReactMethod
    fun signIn(promise: Promise) {
        val activity = getActivityOrNull()
        if (activity == null || !hasProjectId()) {
            promise.resolve(false)
            return
        }

        val client = PlayGames.getGamesSignInClient(activity)
        client.isAuthenticated()
            .addOnSuccessListener { auth ->
                if (auth.isAuthenticated) {
                    promise.resolve(true)
                    return@addOnSuccessListener
                }

                client.signIn()
                    .addOnSuccessListener { result ->
                        promise.resolve(result.isAuthenticated)
                    }
                    .addOnFailureListener {
                        promise.resolve(false)
                    }
            }
            .addOnFailureListener {
                promise.resolve(false)
            }
    }

    @ReactMethod
    fun isSignedIn(promise: Promise) {
        val activity = getActivityOrNull()
        if (activity == null || !hasProjectId()) {
            promise.resolve(false)
            return
        }

        PlayGames.getGamesSignInClient(activity)
            .isAuthenticated()
            .addOnSuccessListener { auth ->
                promise.resolve(auth.isAuthenticated)
            }
            .addOnFailureListener {
                promise.resolve(false)
            }
    }

    @ReactMethod
    fun unlockAchievement(achievementId: String, promise: Promise) {
        val activity = getActivityOrNull()
        if (activity == null || !hasProjectId()) {
            promise.resolve(false)
            return
        }

        PlayGames.getGamesSignInClient(activity)
            .isAuthenticated()
            .addOnSuccessListener { auth ->
                if (!auth.isAuthenticated) {
                    promise.resolve(false)
                    return@addOnSuccessListener
                }

                PlayGames.getAchievementsClient(activity)
                    .unlockImmediate(achievementId)
                    .addOnSuccessListener {
                        promise.resolve(true)
                    }
                    .addOnFailureListener {
                        promise.resolve(false)
                    }
            }
            .addOnFailureListener {
                promise.resolve(false)
            }
    }

    @ReactMethod
    fun submitLeaderboardScore(
        leaderboardId: String,
        score: Double,
        promise: Promise
    ) {
        val activity = getActivityOrNull()
        if (activity == null || !hasProjectId()) {
            promise.resolve(false)
            return
        }

        PlayGames.getGamesSignInClient(activity)
            .isAuthenticated()
            .addOnSuccessListener { auth ->
                if (!auth.isAuthenticated) {
                    promise.resolve(false)
                    return@addOnSuccessListener
                }

                PlayGames.getLeaderboardsClient(activity)
                    .submitScoreImmediate(leaderboardId, score.toLong())
                    .addOnSuccessListener {
                        promise.resolve(true)
                    }
                    .addOnFailureListener {
                        promise.resolve(false)
                    }
            }
            .addOnFailureListener {
                promise.resolve(false)
            }
    }

    @ReactMethod
    fun showAchievements(promise: Promise) {
        val activity = getActivityOrNull()
        if (activity == null || !hasProjectId()) {
            promise.resolve(false)
            return
        }

        PlayGames.getGamesSignInClient(activity)
            .isAuthenticated()
            .addOnSuccessListener { auth ->
                if (!auth.isAuthenticated) {
                    promise.resolve(false)
                    return@addOnSuccessListener
                }

                PlayGames.getAchievementsClient(activity)
                    .achievementsIntent
                    .addOnSuccessListener { intent ->
                        activity.startActivity(intent)
                        promise.resolve(true)
                    }
                    .addOnFailureListener {
                        promise.resolve(false)
                    }
            }
            .addOnFailureListener {
                promise.resolve(false)
            }
    }

    private fun hasProjectId(): Boolean {
        val id = reactApplicationContext
            .getString(R.string.game_services_project_id)
            .trim()

        return id.isNotEmpty() && id != "0"
    }
}
