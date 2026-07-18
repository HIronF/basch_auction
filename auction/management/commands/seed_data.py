from django.core.management.base import BaseCommand
from django.db import transaction
from auction.models import Category, Team, Player, AuctionSettings, BidHistory

class Command(BaseCommand):
    help = "Seed the database with Lawn Tennis Player Auction data"

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
        c_u12 = Category.objects.create(name="Under 12", color="#16A34A", player_limit=6, display_order=1)
        c_beg = Category.objects.create(name="Beginner", color="#2563EB", player_limit=6, display_order=2)
        c_int = Category.objects.create(name="Intermediate", color="#F59E0B", player_limit=6, display_order=3)
        c_adv = Category.objects.create(name="Advanced", color="#DC2626", player_limit=6, display_order=4)

        # Finalized 6 teams with logos (one player per category each)
        teams_data = [
            {"name": "Baseline Warriors", "logo": "/static/assets/teams/baseline-warriors.png", "color": "#1E3A8A"},
            {"name": "Alley Assassins", "logo": "/static/assets/teams/alley-assassins.png", "color": "#111827"},
            {"name": "Net Dominators", "logo": "/static/assets/teams/net-dominators.png", "color": "#14532D"},
            {"name": "Center Court Kings", "logo": "/static/assets/teams/center-court-kings.png", "color": "#1E40AF"},
            {"name": "Rally Rebels", "logo": "/static/assets/teams/rally-rebels.png", "color": "#6B21A8"},
            {"name": "Topspin Titans", "logo": "/static/assets/teams/topspin-titans.png", "color": "#0E7490"},
        ]
        
        for t in teams_data:
            Team.objects.create(
                name=t["name"],
                logo=t["logo"],
                color=t["color"],
                coins=1000,
                starting_coins=1000,
            )

        def get_avatar(initials, bg_color):
            return (
                f"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'>"
                f"<rect width='200' height='200' rx='20' fill='{bg_color}'/>"
                f"<text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='64' font-weight='bold' fill='%23FFFFFF'>{initials}</text>"
                f"</svg>"
            )

        players_pool = [
            # Under 12
            {"name": "Samar", "cat": c_u12, "base": 100, "rank": 1, "seed": 1, "bg": "%2316A34A"},
            {"name": "Advik", "cat": c_u12, "base": 100, "rank": 2, "seed": 2, "bg": "%2315803D"},
            {"name": "Arish", "cat": c_u12, "base": 100, "rank": 3, "seed": 3, "bg": "%23166534"},
            {"name": "Krish", "cat": c_u12, "base": 100, "rank": 4, "seed": 4, "bg": "%2322C55E"},
            {"name": "Ajay", "cat": c_u12, "base": 100, "rank": 5, "seed": 5, "bg": "%234ADE80"},
            {"name": "Vihaan", "cat": c_u12, "base": 100, "rank": 6, "seed": 6, "bg": "%23145A32"},

            # Beginner
            {"name": "Emma Watson", "cat": c_beg, "base": 100, "rank": 1, "seed": 1, "bg": "%232563EB"},
            {"name": "Daniel Kim", "cat": c_beg, "base": 100, "rank": 2, "seed": 2, "bg": "%231D4ED8"},
            {"name": "Sofia Chen", "cat": c_beg, "base": 100, "rank": 3, "seed": 3, "bg": "%231E40AF"},
            {"name": "Oliver Twist", "cat": c_beg, "base": 100, "rank": 4, "seed": 4, "bg": "%233B82F6"},
            {"name": "Mia Wong", "cat": c_beg, "base": 100, "rank": 5, "seed": 5, "bg": "%2360A5FA"},
            {"name": "Noah Garcia", "cat": c_beg, "base": 100, "rank": 6, "seed": 6, "bg": "%231E3A8A"},

            # Intermediate
            {"name": "Elena Petrov", "cat": c_int, "base": 150, "rank": 1, "seed": 1, "bg": "%23F59E0B"},
            {"name": "Alexander Hayes", "cat": c_int, "base": 150, "rank": 2, "seed": 2, "bg": "%23D97706"},
            {"name": "Isabella Cruz", "cat": c_int, "base": 150, "rank": 3, "seed": 3, "bg": "%23B45309"},
            {"name": "Julian Sterling", "cat": c_int, "base": 150, "rank": 4, "seed": 4, "bg": "%23FBBF24"},
            {"name": "Camila Brooks", "cat": c_int, "base": 150, "rank": 5, "seed": 5, "bg": "%23FCD34D"},
            {"name": "Sebastian Lee", "cat": c_int, "base": 150, "rank": 6, "seed": 6, "bg": "%2378350F"},

            # Advanced
            {"name": "Vikram Rathore", "cat": c_adv, "base": 200, "rank": 1, "seed": 1, "bg": "%23DC2626"},
            {"name": "Victoria Kingsley", "cat": c_adv, "base": 200, "rank": 2, "seed": 2, "bg": "%23B91C1C"},
            {"name": "Maximilian Vance", "cat": c_adv, "base": 200, "rank": 3, "seed": 3, "bg": "%23991B1B"},
            {"name": "Ariana DuPont", "cat": c_adv, "base": 200, "rank": 4, "seed": 4, "bg": "%23EF4444"},
            {"name": "Gabriel Thorne", "cat": c_adv, "base": 200, "rank": 5, "seed": 5, "bg": "%23F87171"},
            {"name": "Seraphina Frost", "cat": c_adv, "base": 200, "rank": 6, "seed": 6, "bg": "%237F1D1D"},
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

        # Start with first Under 12 player live
        first_player = Player.objects.filter(category=c_u12).order_by("auction_order").first()
        first_player.status = "Live"
        first_player.save()

        AuctionSettings.objects.create(
            auction_name="Player Auction",
            tournament_name="Lawn Tennis Team Tournament",
            sport_name="Lawn Tennis",
            starting_coins=1000,
            timer=30,
            bid_increments="10,20,50,100,150,200",
            currency_name="Coins",
            currency_icon="🪙",
            current_category=first_player.category,
            current_player=first_player,
            highest_bid=first_player.base_price,
            highest_bidder=None,
            timer_remaining=30,
            auction_status="LIVE"
        )

        self.stdout.write(self.style.SUCCESS(
            "Successfully seeded database with 4 categories, 6 teams, and 24 players!"
        ))
