from django.core.management.base import BaseCommand
from django.db import transaction
from auction.models import Category, Team, Player, AuctionSettings, BidHistory

class Command(BaseCommand):
    help = "Seed the database with initial BASCH Tournament Auction Console data"

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Resetting and seeding database...")
        
        # Clear existing data
        BidHistory.objects.all().delete()
        Player.objects.all().delete()
        Team.objects.all().delete()
        Category.objects.all().delete()
        AuctionSettings.objects.all().delete()

        # Create Categories
        c_u12 = Category.objects.create(name="Under 12", color="#3B82F6", player_limit=6, display_order=1)
        c_beg = Category.objects.create(name="Beginner", color="#10B981", player_limit=6, display_order=2)
        c_int = Category.objects.create(name="Intermediate", color="#F59E0B", player_limit=6, display_order=3)
        c_adv = Category.objects.create(name="Advanced", color="#8B5CF6", player_limit=6, display_order=4)

        # Create Teams
        teams_data = [
            {"name": "Mumbai Aces", "logo": "🏓", "color": "#2563EB", "captain": "Aarav K.", "coach": "Rohan M."},
            {"name": "Hyderabad Hawks", "logo": "🏓", "color": "#EF4444", "captain": "Sanft P.", "coach": "Vikram D."},
            {"name": "Court Warriors", "logo": "🏓", "color": "#8B5CF6", "captain": "Neha S.", "coach": "Ananya T."},
            {"name": "Baseline Falcons", "logo": "🏓", "color": "#10B981", "captain": "Kabir R.", "coach": "Siddharth G."},
            {"name": "Kitchen Smashers", "logo": "🏓", "color": "#F59E0B", "captain": "Priya L.", "coach": "Meera J."},
            {"name": "Dink Dominators", "logo": "🏓", "color": "#06B6D4", "captain": "Devansh N.", "coach": "Ishaan V."},
        ]
        
        for t in teams_data:
            Team.objects.create(
                name=t["name"],
                logo=t["logo"],
                color=t["color"],
                coins=5000,
                starting_coins=5000,
                captain=t["captain"],
                coach=t["coach"]
            )

        # Generate SVG Avatar Helper
        def get_avatar(initials, bg_color):
            # Clean SVG data URI with initials and gradient background
            return (
                f"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'>"
                f"<rect width='200' height='200' rx='20' fill='{bg_color}'/>"
                f"<text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='64' font-weight='bold' fill='%23FFFFFF'>{initials}</text>"
                f"</svg>"
            )

        # Create Players across categories
        players_pool = [
            # Under 12
            {"name": "Aarav Sharma", "cat": c_u12, "base": 100, "rank": 12, "seed": 1, "bg": "%233B82F6"},
            {"name": "Liam O'Connor", "cat": c_u12, "base": 100, "rank": 18, "seed": 2, "bg": "%232563EB"},
            {"name": "Chloe Vance", "cat": c_u12, "base": 100, "rank": 24, "seed": 3, "bg": "%231D4ED8"},
            {"name": "Mateo Rossi", "cat": c_u12, "base": 100, "rank": 30, "seed": 4, "bg": "%2360A5FA"},
            {"name": "Zara Ali", "cat": c_u12, "base": 100, "rank": 42, "seed": 5, "bg": "%2393C5FD"},
            {"name": "Lucas Meier", "cat": c_u12, "base": 100, "rank": 50, "seed": 6, "bg": "%231E3A8A"},

            # Beginner
            {"name": "Emma Watson", "cat": c_beg, "base": 150, "rank": 8, "seed": 1, "bg": "%2310B981"},
            {"name": "Daniel Kim", "cat": c_beg, "base": 150, "rank": 14, "seed": 2, "bg": "%23059669"},
            {"name": "Sofia Chen", "cat": c_beg, "base": 150, "rank": 19, "seed": 3, "bg": "%23047857"},
            {"name": "Oliver Twist", "cat": c_beg, "base": 150, "rank": 25, "seed": 4, "bg": "%2334D399"},
            {"name": "Mia Wong", "cat": c_beg, "base": 150, "rank": 33, "seed": 5, "bg": "%236EE7B7"},
            {"name": "Noah Garcia", "cat": c_beg, "base": 150, "rank": 40, "seed": 6, "bg": "%23064E3B"},

            # Intermediate
            {"name": "Elena Petrov", "cat": c_int, "base": 250, "rank": 5, "seed": 1, "bg": "%23F59E0B"},
            {"name": "Alexander Hayes", "cat": c_int, "base": 250, "rank": 9, "seed": 2, "bg": "%23D97706"},
            {"name": "Isabella Cruz", "cat": c_int, "base": 250, "rank": 15, "seed": 3, "bg": "%23B45309"},
            {"name": "Julian Sterling", "cat": c_int, "base": 250, "rank": 21, "seed": 4, "bg": "%23FBBF24"},
            {"name": "Camila Brooks", "cat": c_int, "base": 250, "rank": 28, "seed": 5, "bg": "%23FCD34D"},
            {"name": "Sebastian Lee", "cat": c_int, "base": 250, "rank": 35, "seed": 6, "bg": "%2378350F"},

            # Advanced
            {"name": "Vikram Rathore", "cat": c_adv, "base": 500, "rank": 1, "seed": 1, "bg": "%238B5CF6"},
            {"name": "Victoria Kingsley", "cat": c_adv, "base": 500, "rank": 2, "seed": 2, "bg": "%237C3AED"},
            {"name": "Maximilian Vance", "cat": c_adv, "base": 500, "rank": 3, "seed": 3, "bg": "%236D28D9"},
            {"name": "Ariana DuPont", "cat": c_adv, "base": 500, "rank": 4, "seed": 4, "bg": "%23A78BFA"},
            {"name": "Gabriel Thorne", "cat": c_adv, "base": 500, "rank": 6, "seed": 5, "bg": "%23C4B5FD"},
            {"name": "Seraphina Frost", "cat": c_adv, "base": 500, "rank": 7, "seed": 6, "bg": "%234C1D95"},
        ]

        for i, p in enumerate(players_pool, start=1):
            initials = "".join([part[0] for part in p["name"].split()[:2]])
            Player.objects.create(
                name=p["name"],
                photo=get_avatar(initials, p["bg"]),
                category=p["cat"],
                base_price=p["base"],
                sold_price=0,
                sold_to=None,
                status="Upcoming",
                ranking=p["rank"],
                seed=p["seed"],
                auction_order=i
            )

        # Set first player as live current_player
        first_player = Player.objects.order_by("auction_order").first()
        first_player.status = "Live"
        first_player.save()

        # Create AuctionSettings
        AuctionSettings.objects.create(
            auction_name="BASCH",
            tournament_name="Team Pickleball Championship 2026",
            sport_name="Pickleball",
            starting_coins=5000,
            timer=30,
            bid_increments="10,20,50,100",
            currency_name="Coins",
            currency_icon="💰",
            current_category=first_player.category if first_player else None,
            current_player=first_player,
            highest_bid=first_player.base_price if first_player else 0,
            highest_bidder=None,
            timer_remaining=30,
            auction_status="READY"
        )

        self.stdout.write(self.style.SUCCESS("Successfully seeded database with 4 categories, 6 teams, and 24 players!"))
