﻿QUnit.module("Long Polling Facts", testUtilities.longPollingEnabled);

QUnit.asyncTimeoutTest("Connection shifts into appropriate states.", 10000, function (end, assert) {
    var connection = testUtilities.createHubConnection(),
        demo = connection.createHubProxies().demo,
        tryReconnect = function () {
            // Verify that the polling connection is instantiated before trying to abort it. We want
            // to cause the transport to error so it must be instantiated first.
            if (connection.pollXhr.readyState !== 1) {
                setTimeout(tryReconnect, 200);
            }
            else {
                // Passing "foo" forces the longPolling's ajax connection to error and pass "foo" as the 
                // reason, the default error (empty) is "abort" which we handle as do not attempt to 
                // reconnect. So by passing foo we mimic the behavior of an unintended error occurring, 
                // forcing the transport into reconnecting.
                connection.pollXhr.abort("foo");
            }
        };

    // Need to have at least one client function in order to be subscribed to a hub
    demo.client.foo = function () { };

    assert.equal($.signalR.connectionState.disconnected, connection.state, "SignalR state is disconnected prior to start.");

    connection.start({ transport: 'longPolling' }).done(function () {
        assert.equal($.signalR.connectionState.connected, connection.state, "SignalR state is connected once start callback is called.");

        // Wire up the state changed (while connected) to detect if we shift into reconnecting
        // In a later test we'll determine if reconnected gets called
        connection.stateChanged(function () {
            if (connection.state == $.signalR.connectionState.reconnecting) {
                assert.ok(true, "SignalR state is reconnecting.");
                end();
            }
        });

        tryReconnect();
    }).fail(function (reason) {
        assert.ok(false, "Failed to initiate signalr connection");
        end();
    });

    assert.equal($.signalR.connectionState.connecting, connection.state, "SignalR state is connecting prior to start deferred resolve.");

    // Cleanup
    return function () {
        connection.stop();
    };
});

QUnit.asyncTimeoutTest("Connection StateChanged event is called for every state", 10000, function (end, assert) {
    var connection = testUtilities.createHubConnection(),
        demo = connection.createHubProxies().demo,
        tryReconnect = function () {
            // Verify that the polling connection is instantiated before trying to abort it. We want
            // to cause the transport to error so it must be instantiated first.
            if (connection.pollXhr.readyState !== 1) {
                setTimeout(tryReconnect, 200);
            }
            else {
                // Passing "foo" forces the longPolling's ajax connection to error and pass "foo" as the 
                // reason, the default error (empty) is "abort" which we handle as do not attempt to 
                // reconnect. So by passing foo we mimic the behavior of an unintended error occurring, 
                // forcing the transport into reconnecting.
                connection.pollXhr.abort("foo");
            }
        },
        statesSet = {};

    // Preset all state values to false
    for (var key in $.signalR.connectionState) {
        statesSet[$.signalR.connectionState[key]] = 0;
    }

    connection.stateChanged(function () {
        statesSet[connection.state]++;

        if (connection.state == $.signalR.connectionState.reconnecting) {
            connection.stop();

            for (var key in $.signalR.connectionState) {
                assert.equal(statesSet[$.signalR.connectionState[key]], 1, "SignalR " + key + " state was called via state changed exactly once.");
            }
            end();
        }
    });

    // Need to have at least one client function in order to be subscribed to a hub
    demo.client.foo = function () { };

    connection.start({ transport: 'longPolling' }).done(function () {
        tryReconnect();
    }).fail(function (reason) {
        assert.ok(false, "Failed to initiate signalr connection");
        end();
    });

    // Cleanup
    return function () {
        connection.stop();
    };
});