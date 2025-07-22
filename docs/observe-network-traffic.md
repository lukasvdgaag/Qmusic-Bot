# Observe Network Traffic
To find out how the QMusic app is using the network, the network traffic needs to be observed.
To do this, we have used **Charles Proxy**.

## Install Charles Proxy (PC/Mac)
1. Download and install Charles Proxy from [https://www.charlesproxy.com/](https://www.charlesproxy.com/).
2. Open Charles Proxy and go to **Help** > **SSL Proxying** > **Install Charles Root Certificate**.
3. Follow the instructions to install the Charles Root Certificate on your system.

## Configure Your Device for Charles Proxy
There are a few ways to observe network traffic using Charles Proxy: your own computer, an emulator, or a mobile device.

### On Your Own Computer
1. Open Charles Proxy.
2. Make sure your computer's network settings are configured to use Charles as a proxy.

### On an Emulator
1. Open Charles Proxy.
2. Configure the emulator to use Charles as a proxy:
   - For Android, go to **Settings** > **Network & internet** > **Advanced** > **Proxy** and set the proxy to your computer's IP address and the port Charles is using (default is 8888).
   - For iOS, go to **Settings** > **Wi-Fi**, tap the "i" next to your network, scroll down to **HTTP Proxy**, and set it to manual with your computer's IP address and port.

### On a Mobile Device
1. Open Charles Proxy.
2. Connect your mobile device to the same Wi-Fi network as your computer.
3. On your mobile device, go to **Settings** > **Wi-Fi**, tap the "i" next to your network, scroll down to **HTTP Proxy**, and set it to manual with your computer's IP address and port (default is 8888).
4. Install the Charles Root Certificate on your mobile device: 
   - Download the mobile certificate from [https://chls.pro/ssl](http://chls.pro/ssl). This should happen automatically.
   - For iOS, go to **Settings** > **General** > **About** > **Certificate Trust Settings** and enable full trust for the Charles Proxy certificate.
   - For Android, go to **Settings** > **Security** > **Install from storage** and select the Charles Proxy certificate.

## Start Capturing Traffic
1. In Charles Proxy, make sure recording is enabled (the red circle at the top left should be active).
2. Open the app, website, or service you want to observe on your device or emulator.
3. Perform the actions you want to observe in the app.
4. You should see the network requests appearing in Charles Proxy as you interact with the app.
5. **Make sure SSL Proxying is enabled**: Go to **Proxy** > **SSL Proxying Settings** and ensure that the domains you want to capture are included. You can add `*` to capture all traffic.
6. You can click on individual requests to see details such as headers, body, and response.
7. To stop capturing traffic, click the red circle again to disable recording.
8. You can save the session by going to **File** > **Save Session** to keep a record of the captured traffic for later analysis.

> [!NOTE]
> You likely need to filter the traffic to only show the requests relevant to your actions.
> You can do this by using the filter search bar at the bottom of the Charles window.