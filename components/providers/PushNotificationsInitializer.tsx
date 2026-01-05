"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "@/hooks/use-toast";

const beamsInstanceId = process.env.NEXT_PUBLIC_PUSHER_BEAMS_INSTANCE_ID;

const PushNotificationsInitializer = () => {
  const { isSignedIn, user } = useUser();
  const [scriptReady, setScriptReady] = useState(false);
  const beamsClientRef = useRef<InstanceType<
    NonNullable<(typeof window)["PusherPushNotifications"]>["Client"]
  > | null>(null);
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const isStartedRef = useRef<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    const waitForScript = () => {
      if (cancelled) return;
      if (
        typeof window !== "undefined" &&
        window.PusherPushNotifications &&
        !scriptReady
      ) {
        setScriptReady(true);
        return;
      }

      setTimeout(waitForScript, 300);
    };

    waitForScript();

    return () => {
      cancelled = true;
    };
  }, [scriptReady]);

  const userId = user?.id;

  useEffect(() => {
    if (!scriptReady || !isSignedIn || !userId) return;
    if (!beamsInstanceId) {
      console.warn("Missing NEXT_PUBLIC_PUSHER_BEAMS_INSTANCE_ID");
      return;
    }

    let isMounted = true;

    const registerDevice = async () => {
      try {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
          console.warn("Service workers are not supported in this browser.");
          return;
        }

        const ensureServiceWorker = async () => {
          const existing =
            (await navigator.serviceWorker.getRegistration("/service-worker.js")) ??
            (await navigator.serviceWorker.register("/service-worker.js"));

          await navigator.serviceWorker.ready;
          return existing;
        };

        await ensureServiceWorker();

        if (!window.PusherPushNotifications) {
          throw new Error("Pusher Beams script is not available yet.");
        }

        if (!beamsClientRef.current) {
          beamsClientRef.current = new window.PusherPushNotifications.Client({
            instanceId: beamsInstanceId,
          });
        }

        const ensureNotificationPermission = async () => {
          if (typeof window === "undefined" || !("Notification" in window)) {
            return { granted: false, reason: "Notifications are not supported in this browser." };
          }

          if (Notification.permission === "granted") {
            return { granted: true };
          }

          if (Notification.permission === "denied") {
            return { granted: false, reason: "Notifications have been blocked for this site." };
          }

          const result = await Notification.requestPermission();
          return {
            granted: result === "granted",
            reason:
              result === "denied"
                ? "Notifications have been blocked for this site."
                : "Notification permission was dismissed.",
          };
        };

        const { granted, reason } = await ensureNotificationPermission();

        if (!granted) {
          if (isMounted) {
            toast({
              title: "Enable notifications to stay updated",
              description: reason ?? "Please allow notifications in your browser settings.",
            });
          }
          startPromiseRef.current = null;
          return;
        }

        if (!startPromiseRef.current) {
          startPromiseRef.current = beamsClientRef.current.start().catch((error) => {
            startPromiseRef.current = null;
            isStartedRef.current = false;
            throw error;
          });
        }

        await startPromiseRef.current;
        isStartedRef.current = true;

        const interest = `user-${userId}`;
        await beamsClientRef.current.addDeviceInterest(interest);
        console.info("Beams: registered interest", interest);
      } catch (error) {
        console.error("Failed to initialize push notifications", error);
        if (isMounted) {
          const description =
            error instanceof Error
              ? error.message
              : "Please refresh the page and try again.";

          toast({
            title: "Push notifications unavailable",
            description,
            variant: "destructive",
          });
        }
      }
    };

    registerDevice();

    return () => {
      isMounted = false;
    };
  }, [isSignedIn, scriptReady, userId]);

  useEffect(() => {
    // Only clear interests if user is signed out AND client has been successfully started
    if (isSignedIn || !beamsClientRef.current || !isStartedRef.current) return;

    // Clear device interests when user signs out
    beamsClientRef.current
      .clearDeviceInterests()
      .then(() => {
        isStartedRef.current = false;
        console.info("Beams: cleared device interests");
      })
      .catch((error: unknown) => {
        // Silently ignore "SDK not registered" errors (client may have been cleaned up already)
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('SDK not registered') && !errorMessage.includes('not registered with Beams')) {
          console.error("Failed to clear Beams interests", error);
        }
        isStartedRef.current = false;
      });
  }, [isSignedIn]);

  return null;
};

export default PushNotificationsInitializer;

