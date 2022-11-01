
class UserRecord {
    constructor(private _userId: string) {}

    public submitPurchase(purchase: Purchase) {
        this.purchases.push(purchase);
    }

    private purchases: Purchase[];
}

class Purchase {
    constructor(public userId, public server) {}
}

class RecordManager {
    constructor() {}
}