# Monitor clinic-hours availability

On an external monitoring host with Bash, GNU date, and curl, pass the
deployment's health endpoint at runtime:

```bash
HEALTH_CSV=/var/lib/villadent-monitor/health.csv \
  ./scripts/monitor/health-monitor.sh "$HEALTH_URL"
./scripts/monitor/summary.sh /var/lib/villadent-monitor/health.csv
```

Set `HEALTH_URL` to the deployment's `/actuator/health` URL when a deployment
exists. Create the CSV's parent directory and grant write access to the monitor
account. Run only one writer for each file. An optional second argument
changes the 300-second polling interval for testing.

The script samples Monday–Saturday, 08:00–12:00 and 14:00–18:00
(America/Bogota, end times exclusive). Only HTTP 200 counts as available;
transport errors appear as HTTP 000. Availability is the percentage of
recorded samples returning 200, not continuous-time uptime. A recovery value
measures from the first observed failed probe to the first successful one in
the same clinic shift and process. It is a polling-resolution estimate, not
proof that a provider cold start caused the failure.

## Schedule one continuous process

With cron, start one writer at reboot and keep a lock for its lifetime:
```cron
@reboot HEALTH_CSV=/var/lib/villadent-monitor/health.csv /usr/bin/flock -n /var/lib/villadent-monitor/monitor.lock /opt/villadent/scripts/monitor/health-monitor.sh HEALTH_URL
```

Or set up a service and a timer with the same unit basename. Substitute the
real health URL for `HEALTH_URL` in either example.

```ini
# villadent-monitor.service
[Unit]
After=network-online.target
Wants=network-online.target
[Service]
DynamicUser=yes
StateDirectory=villadent-monitor
Environment=HEALTH_CSV=/var/lib/villadent-monitor/health.csv
ExecStart=/opt/villadent/scripts/monitor/health-monitor.sh HEALTH_URL
Restart=on-failure
```

```ini
# villadent-monitor.timer
[Timer]
OnBootSec=1min
[Install]
WantedBy=timers.target
```

Enable with `systemctl enable --now villadent-monitor.timer`. Use the timer or
cron, not both.
